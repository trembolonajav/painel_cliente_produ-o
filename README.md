# Painel do Cliente

Aplicacao web para operacao interna e acompanhamento de casos por clientes, com area administrativa, portal do cliente, backend API, banco PostgreSQL e storage de documentos.

## Visao geral

O projeto esta organizado em um unico repositorio com:

- frontend React/Vite na raiz
- backend Spring Boot em [`backend`](backend/)
- banco PostgreSQL
- storage S3-compatible via Cloudflare R2 em producao

O fluxo principal atende dois perfis:

- equipe interna: autenticacao, gestao de casos, clientes, parceiros, usuarios, documentos, etapas e patrimonio
- cliente final: acesso ao portal por link temporario para acompanhar caso, etapas, documentos e estrutura patrimonial visivel

## Stack utilizada

- Frontend: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, React Query
- Backend: Java 21, Spring Boot 3, Spring Security, Spring Data JPA, Flyway
- Banco: PostgreSQL
- Storage: Cloudflare R2
- Deploy: Vercel (frontend) e Railway (backend)

## Modulos principais

- autenticacao administrativa
- dashboard administrativo de casos
- cadastro e manutencao de clientes
- cadastro e manutencao de parceiros
- cadastro e manutencao de usuarios internos
- detalhamento operacional de casos
- portal do cliente com sessao temporaria
- upload e download seguro de documentos
- estrutura patrimonial com visibilidade controlada ao cliente

## Arquitetura resumida

- o frontend consome a API HTTP do backend por meio da variavel `VITE_API_URL`
- o backend centraliza autenticacao, regras de acesso, persistencia e geracao de links temporarios
- o PostgreSQL armazena dados operacionais, sessoes, links, auditoria e workflow
- o Cloudflare R2 armazena documentos e atende download/upload por URLs assinadas

Documentacao complementar:

- [`docs/architecture.md`](docs/architecture.md)
- [`docs/environment.md`](docs/environment.md)
- [`docs/deploy.md`](docs/deploy.md)
- [`docs/handoff.md`](docs/handoff.md)
- [`docs/checklist-entrega.md`](docs/checklist-entrega.md)

## Estrutura principal

```text
.
|-- backend/               # API Spring Boot, migracoes Flyway e configuracoes de deploy
|-- public/                # ativos publicos do frontend
|-- src/                   # aplicacao frontend
|-- docs/                  # documentacao operacional e handoff
|-- vercel.json            # configuracao de deploy do frontend
`-- package.json           # scripts do frontend
```

## Execucao local

### Frontend

```bash
npm install
npm run dev
```

Por padrao, o frontend espera a API configurada por `VITE_API_URL`. Em ambiente local, a URL deve apontar para a API Spring Boot em execucao.

### Backend

Consulte o guia resumido em [`backend/README.md`](backend/README.md). O backend utiliza PostgreSQL e executa migracoes Flyway no startup.

## Deploy resumido

- frontend publicado na Vercel a partir da raiz do repositorio
- backend publicado na Railway a partir da pasta `backend`
- banco PostgreSQL hospedado na Railway
- documentos hospedados no Cloudflare R2

A documentacao detalhada de publicacao, ordem de configuracao e validacoes esta em [`docs/deploy.md`](docs/deploy.md).

## Operacao e manutencao

- manter coerencia entre `VITE_API_URL`, `CORS_ALLOWED_ORIGINS` e `APP_FRONTEND_BASE_URL`
- garantir que as credenciais de banco e storage sejam gerenciadas fora do repositorio
- validar deploy sempre pelos endpoints de saude, login e fluxos principais
- usar `main` como referencia de producao e `dev` como referencia de desenvolvimento

## Continuidade

Este repositorio foi preparado para handoff tecnico. O documento principal de continuidade esta em [`docs/handoff.md`](docs/handoff.md).
