/**
 * Interface genérica de armazenamento em nuvem.
 * A nuvem usada é o Firebase do projeto (acscomunitario-704be).
 */
export type ArquivoRemoto = {
  id: string;
  nome: string;
  tamanho?: number;
  modificadoEm?: string;
};

export interface StorageProvider {
  readonly id: "firebase";
  readonly nome: string;
  conectado(): boolean | Promise<boolean>;
  conectar(): Promise<void>;
  desconectar(): Promise<void>;
  listar(prefixo: string): Promise<ArquivoRemoto[]>;
  baixar(nome: string): Promise<string | null>;
  enviar(nome: string, conteudo: string): Promise<void>;
  espacoUsado(prefixo: string): Promise<number>;
}

export type ProvedorId = "firebase";

/** A nuvem do Firebase fica sempre ativa para quem está conectado. */
export function provedorEscolhido(): ProvedorId | null {
  if (typeof window === "undefined") return null;
  return "firebase";
}

export function definirProvedor(_id: ProvedorId | null) {
  if (typeof window !== "undefined") localStorage.removeItem("acs.storage.provider");
}
