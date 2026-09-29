# ACS Território

PWA offline-first para Agentes Comunitários de Saúde: cadastro de famílias, agenda de visitas, mapa do território, transferências entre unidades e sincronização segura com a nuvem.

## Arquitetura

| Camada | Tecnologia |
| --- | --- |
| Framework | TanStack Start v1 (React 19, SSR, server functions) + Vite |
| Roteamento | TanStack Router (file-based, `src/routes`) |
| Dados remotos | Supabase (Postgres + RLS) |
| Identidade | Firebase Auth / Firestore (perfis, permissões, dispositivos) |
| Offline | IndexedDB via Dexie + motor de sincronização (`src/sync`) + Service Worker (vite-plugin-pwa) |
| UI | Tailwind CSS v4 + shadcn/ui (Radix) |
| Mapas | Leaflet / react-leaflet (tiles em cache) |

Fluxo offline-first: toda escrita vai primeiro ao banco local (Dexie); o `syncEngine` envia as alterações ao Supabase quando há conexão e resolve conflitos. Dados sensíveis são criptografados por unidade (`src/security`).

## Pré-requisitos

- Node.js 20+ e [Bun](https://bun.sh) 1.1+ (gerenciador padrão do projeto — `bun.lock`)
- Um projeto Supabase e um projeto Firebase

## Instalação

```sh
git clone <url-do-repositorio>
cd acs-territorio
bun install
cp .env.example .env   # preencha os valores
bun run dev            # http://localhost:8080
```

## Variáveis de ambiente

Todas estão documentadas em `.env.example`. Variáveis `VITE_*` vão para o navegador (apenas chaves públicas). `SUPABASE_SERVICE_ROLE_KEY` e `LOVABLE_API_KEY` são exclusivas do servidor — nunca prefixe com `VITE_`.

Aplique o schema com `supabase db push` (migrations em `supabase/migrations`) e publique as regras do Firestore (`firestore.rules`).

## Scripts

| Script | Descrição |
| --- | --- |
| `bun run dev` | Servidor de desenvolvimento |
| `bun run build` | Build de produção |
| `bun run preview` | Pré-visualiza o build |
| `bun run lint` | ESLint |
| `bun run typecheck` | `tsc --noEmit` |

## Deploy

O build gera um Worker compatível com **Cloudflare** (Workers/Pages). Configure as variáveis de ambiente no painel do provedor e rode `bun run build`. Para Vercel/Netlify, ajuste o preset do Nitro conforme a documentação do TanStack Start.

## Estrutura de pastas

```text
src/
  auth/           Provider de sessão e matriz de permissões
  components/     Componentes da aplicação; ui/ = shadcn
  database/       Banco local (Dexie) e repositórios
  devices/        Registro e controle de dispositivos
  hooks/          Hooks de dados, sessão e notificações
  integrations/   Clientes Supabase (browser, servidor, middleware)
  lib/            Utilitários, Firebase, server functions (*.functions.ts)
  routes/         Rotas file-based; _authenticated/ = área protegida
  security/       Criptografia e sanitização
  storage/        Backup no Google Drive
  sync/           Motor de sincronização e backup
supabase/         config.toml e migrations SQL (RLS)
public/           Manifest PWA, ícones, robots/sitemap
```

## Licença

[MIT](./LICENSE)
