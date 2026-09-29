/**
 * Contexto central do aplicativo: sessão, perfil/permissões (Firebase),
 * unidade, chave de criptografia, dispositivo, banco local e sincronização.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { auth, db, lerDocRapido } from "@/lib/firebase";
import { ehEmailAdmin } from "@/lib/auth";
import { comTempo } from "@/lib/comTempo";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { EMAIL_MASTER, type Funcao, type Permissao, pode } from "./permissions";
import { chaveAtual, desbloquearUnidade, esquecerChave } from "@/security/chaveUnidade";
import { registrarDispositivo, type Dispositivo, deviceId } from "@/devices/deviceManager";
import { provedorEscolhido, definirProvedor, type ProvedorId } from "@/storage/storageProvider";
import { firebaseProvider, definirContextoNuvem } from "@/storage/firebaseCloud";
import { sincronizar, type EstadoSync, contarConflitos } from "@/sync/syncEngine";
import { bancoLocal, lerMeta } from "@/database/localDatabase";
import type { Contexto } from "@/database/repositories";

export type Perfil = {
  id: string;
  nome: string;
  email: string;
  funcao: Funcao;
  unitId: string | null;
  unidade?: string | null;
  micro_area?: string | null;
  permissoes?: Permissao[] | null;
  /** Abas liberadas para esta pessoa (vazio = todas as do seu perfil). */
  abas?: string[] | null;
  aprovado: boolean;
  bloqueado?: boolean;
  ultimoAcesso?: string | null;
  created_at?: string;
};

type AcsContexto = {
  user: (FirebaseUser & { id: string }) | null;
  perfil: Perfil | null;
  carregando: boolean;
  falhaPerfil: string | null;
  ctx: Contexto | null;
  chave: CryptoKey | null;
  dispositivo: Dispositivo | null;
  provedor: ProvedorId | null;
  estado: EstadoSync;
  pendentes: number;
  conflitos: number;
  ultimaSync: string | null;
  detalheSync: string | null;
  online: boolean;
  autorizado: (p: Permissao) => boolean;
  desbloquear: (senha: string) => Promise<void>;
  conectarProvedor: (id: ProvedorId) => Promise<void>;
  desconectarProvedor: () => Promise<void>;
  sincronizarAgora: () => Promise<void>;
  recarregarPerfil: () => Promise<void>;
};

// Mantém o mesmo contexto quando o arquivo é recarregado em desenvolvimento,
// evitando que o provedor e as telas fiquem com cópias diferentes.
const g = globalThis as { __acsCtx?: React.Context<AcsContexto | null> };
const Ctx = (g.__acsCtx ??= createContext<AcsContexto | null>(null));

export function providerAtual(id: ProvedorId | null) {
  return id === "firebase" ? firebaseProvider : null;
}

export function AcsProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<(FirebaseUser & { id: string }) | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [falhaPerfil, setFalhaPerfil] = useState<string | null>(null);
  const [chave, setChave] = useState<CryptoKey | null>(null);
  const [dispositivo, setDispositivo] = useState<Dispositivo | null>(null);
  const [provedor, setProvedorState] = useState<ProvedorId | null>(null);
  const [estado, setEstado] = useState<EstadoSync>("READY");
  const [pendentesN, setPendentes] = useState(0);
  const [conflitosN, setConflitos] = useState(0);
  const [ultimaSync, setUltimaSync] = useState<string | null>(null);
  const [detalheSync, setDetalheSync] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const timer = useRef<number | null>(null);

  /* ---------------- sessão + perfil ---------------- */

  const carregarPerfil = useCallback(async (u: FirebaseUser) => {
    setFalhaPerfil(null);
    const ref = doc(db, "profiles", u.uid);
    const snap = await lerDocRapido(ref);
    const email = (u.email || "").toLowerCase();
    const ehMaster = email === EMAIL_MASTER;
    const ehAdmin = ehEmailAdmin(email);

    if (!snap.exists()) {
      const novo: Perfil = {
        id: u.uid,
        nome: u.displayName || email.split("@")[0] || "",
        email,
        funcao: ehMaster ? "master" : ehAdmin ? "admin" : "agente",
        unitId: ehAdmin ? "unidade-principal" : null,
        aprovado: ehAdmin,
        bloqueado: false,
        created_at: new Date().toISOString(),
      };
      // Gravação em segundo plano: o cache local confirma na hora.
      void setDoc(ref, novo).catch(() => undefined);
      setPerfil(novo);
      return novo;
    }

    const dados = snap.data() as Partial<Perfil> & { role?: string };
    const perfilAtual: Perfil = {
      id: u.uid,
      nome: dados.nome || u.displayName || "",
      email,
      funcao: (ehMaster
        ? "master"
        : ehAdmin && dados.funcao !== "master"
          ? "admin"
          : dados.funcao || (dados.role === "admin" ? "admin" : "agente")) as Funcao,
      unitId: dados.unitId ?? (ehAdmin ? "unidade-principal" : null),
      unidade: dados.unidade ?? null,
      micro_area: dados.micro_area ?? null,
      permissoes: dados.permissoes ?? null,
      abas: (dados as any).abas ?? null,
      aprovado: ehAdmin ? true : !!dados.aprovado,
      bloqueado: !!dados.bloqueado,
      ultimoAcesso: dados.ultimoAcesso ?? null,
      created_at: dados.created_at,
    };
    void updateDoc(ref, {
      funcao: perfilAtual.funcao,
      unitId: perfilAtual.unitId,
      aprovado: perfilAtual.aprovado,
      ultimoAcesso: new Date().toISOString(),
    }).catch(() => undefined);
    setPerfil(perfilAtual);
    return perfilAtual;
  }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setUser(null);
        setPerfil(null);
        setFalhaPerfil(null);
        setCarregando(false);
        return;
      }
      setUser(Object.assign(u, { id: u.uid }));
      try {
        const p = await carregarPerfil(u);
        try {
          setDispositivo(
            await comTempo(
              registrarDispositivo(
                u.uid,
                p.unitId,
                p.funcao === "master" || p.funcao === "admin",
              ),
            ),
          );
        } catch {
          setDispositivo(null);
        }
        if (p.unitId) setChave(await chaveAtual(p.unitId).catch(() => null));
      } catch {
        const email = (u.email || "").trim().toLowerCase();
        if (email === EMAIL_MASTER) {
          const unitIdMaster = "unidade-principal";
          const perfilMaster: Perfil = {
            id: u.uid,
            nome: u.displayName || email.split("@")[0] || "Master",
            email,
            funcao: "master",
            unitId: unitIdMaster,
            aprovado: true,
            bloqueado: false,
          };
          setPerfil(perfilMaster);
          setDispositivo(null);
          setChave(await chaveAtual(unitIdMaster).catch(() => null));
        } else {
          setPerfil(null);
          setFalhaPerfil("Não foi possível preparar sua conta. Verifique a conexão e tente novamente.");
        }
      }
      setProvedorState(provedorEscolhido());
      setUltimaSync((await lerMeta<string>("sync.ultima")) ?? null);
      setCarregando(false);
    });
  }, [carregarPerfil]);

  // A nuvem precisa saber a agência (unidade) e o agente para escolher a o destino.
  useEffect(() => {
    definirContextoNuvem(perfil?.unitId ?? null, perfil?.id ?? null);
  }, [perfil?.unitId, perfil?.id]);

  /* ---------------- estado offline / contadores ---------------- */

  useEffect(() => {
    if (typeof window === "undefined") return;
    const atualiza = () => setOnline(navigator.onLine);
    atualiza();
    window.addEventListener("online", atualiza);
    window.addEventListener("offline", atualiza);
    return () => {
      window.removeEventListener("online", atualiza);
      window.removeEventListener("offline", atualiza);
    };
  }, []);

  const atualizarContadores = useCallback(async () => {
    setPendentes(await bancoLocal.sync_queue.where("status").anyOf("PENDING", "FAILED").count());
    setConflitos(await contarConflitos());
  }, []);

  useEffect(() => {
    void atualizarContadores();
    const i = window.setInterval(atualizarContadores, 4000);
    return () => window.clearInterval(i);
  }, [atualizarContadores]);

  /* ---------------- sincronização ---------------- */

  const sincronizarAgora = useCallback(async () => {
    const prov = providerAtual(provedor);
    if (!prov || !chave || !perfil?.unitId) {
      setEstado("STORAGE_NOT_CONFIGURED");
      setDetalheSync("Entre na sua conta para enviar os registros pendentes.");
      return;
    }
    if (!(await prov.conectado())) {
      setEstado("STORAGE_NOT_CONFIGURED");
      setDetalheSync("Entre na sua conta para usar a nuvem da equipe.");
      return;
    }
    setEstado("SYNCING");
    setDetalheSync("Preparando a cópia criptografada para envio…");
    const r = await sincronizar(prov, chave, perfil.unitId);
    setEstado(r.estado);
    setDetalheSync(
      r.erro ??
        (r.estado === "READY"
          ? r.enviados > 0
            ? `${r.enviados} alteração(ões) enviada(s) e ${r.recebidos} recebida(s).`
            : `Nuvem conferida. ${r.recebidos} alteração(ões) recebida(s).`
          : null),
    );
    setUltimaSync((await lerMeta<string>("sync.ultima")) ?? null);
    await atualizarContadores();
  }, [provedor, chave, perfil?.unitId, atualizarContadores]);

  // Sincronização automática ao voltar a conexão e a cada 2 minutos.
  useEffect(() => {
    if (!online || !chave || !provedor) return;
    void sincronizarAgora();
    timer.current = window.setInterval(() => void sincronizarAgora(), 120_000);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [online, chave, provedor, sincronizarAgora]);

  /* ---------------- ações ---------------- */

  const desbloquear = useCallback(
    async (senha: string) => {
      if (!perfil?.unitId) throw new Error("Sua conta ainda não está vinculada a uma unidade.");
      const unidadeRef = doc(db, "units", perfil.unitId);
      const snap = await getDoc(unidadeRef).catch(() => null);
      const esperada = snap?.exists()
        ? ((snap.data() as { keyFingerprint?: string }).keyFingerprint ?? null)
        : null;
      const { chave: nova, impressao } = await desbloquearUnidade(senha, perfil.unitId, esperada);
      if (!esperada) {
        await setDoc(
          unidadeRef,
          { id: perfil.unitId, nome: perfil.unidade || "Unidade", keyFingerprint: impressao },
          { merge: true },
        );
      }
      setChave(nova);
    },
    [perfil?.unitId, perfil?.unidade],
  );

  const conectarProvedor = useCallback(
    async (id: ProvedorId) => {
      const prov = providerAtual(id);
      if (!prov) return;
      setDetalheSync("Conectando à nuvem da equipe…");
      await prov.conectar();
      definirProvedor(id);
      setProvedorState(id);

      if (!chave || !perfil?.unitId) {
        setEstado("STORAGE_NOT_CONFIGURED");
        setDetalheSync("Libere o aparelho com a senha da equipe antes de sincronizar.");
        throw new Error("Libere o aparelho com a senha da equipe antes de sincronizar.");
      }

      setEstado("SYNCING");
      setDetalheSync("Nuvem conectada. Enviando a cópia criptografada…");
      const resultado = await sincronizar(prov, chave, perfil.unitId);
      setEstado(resultado.estado);
      setDetalheSync(
        resultado.erro ??
          (resultado.estado === "READY"
            ? `${resultado.enviados} alteração(ões) enviada(s) e ${resultado.recebidos} recebida(s).`
            : null),
      );
      setUltimaSync((await lerMeta<string>("sync.ultima")) ?? null);
      await atualizarContadores();
      if (resultado.erro) throw new Error(resultado.erro);
    },
    [chave, perfil?.unitId, atualizarContadores],
  );

  const desconectarProvedor = useCallback(async () => {
    const prov = providerAtual(provedor);
    await prov?.desconectar();
    definirProvedor(null);
    setProvedorState(null);
    setEstado("STORAGE_NOT_CONFIGURED");
    setDetalheSync("Nuvem desativada neste aparelho.");
  }, [provedor]);

  const recarregarPerfil = useCallback(async () => {
    if (!auth.currentUser) return;
    setCarregando(true);
    try {
      await carregarPerfil(auth.currentUser);
    } catch {
      setFalhaPerfil("Não foi possível preparar sua conta. Verifique a conexão e tente novamente.");
    } finally {
      setCarregando(false);
    }
  }, [carregarPerfil]);

  const ctx: Contexto | null = useMemo(() => {
    if (!perfil || !perfil.unitId) return null;
    return {
      userId: perfil.id,
      unitId: perfil.unitId,
      funcao: perfil.funcao,
      permissoes: perfil.permissoes ?? null,
      aprovado: perfil.aprovado,
      bloqueado: perfil.bloqueado,
    };
  }, [perfil]);

  const valor: AcsContexto = {
    user,
    perfil,
    carregando,
    falhaPerfil,
    ctx,
    chave,
    dispositivo,
    provedor,
    estado: !online ? "OFFLINE" : conflitosN > 0 ? "CONFLICT" : estado,
    pendentes: pendentesN,
    conflitos: conflitosN,
    ultimaSync,
    detalheSync,
    online,
    autorizado: (p) => pode(ctx, p),
    desbloquear,
    conectarProvedor,
    desconectarProvedor,
    sincronizarAgora,
    recarregarPerfil,
  };

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useAcs() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAcs precisa estar dentro de AcsProvider");
  return v;
}

export { esquecerChave, deviceId };
