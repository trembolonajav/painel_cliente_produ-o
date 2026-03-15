# Deploy

## Topologia de producao

- frontend: Vercel
- backend: Railway
- banco de dados: PostgreSQL
- storage de documentos: Cloudflare R2

## Ordem recomendada de configuracao

1. Provisionar o PostgreSQL.
2. Provisionar o bucket e as credenciais do Cloudflare R2.
3. Publicar o backend na Railway com as variaveis de ambiente.
4. Validar `GET /health` no backend.
5. Publicar o frontend na Vercel apontando para a URL publica do backend.
6. Ajustar `CORS_ALLOWED_ORIGINS` e `APP_FRONTEND_BASE_URL`.
7. Validar login, operacao administrativa, portal do cliente e documentos.

## Frontend na Vercel

Configuracao esperada:

- root directory: raiz do repositorio
- build command: `npm run build`
- output directory: `dist`

Variavel de ambiente relevante:

- `VITE_API_URL`: URL publica do backend

Observacao:

- o arquivo [`vercel.json`](../vercel.json) ja atende o comportamento de SPA e nao deve ser alterado nesta etapa documental

## Backend na Railway

Configuracao esperada:

- root directory: `backend`
- build: Nixpacks automatico
- healthcheck: `/health`

O backend aplica migracoes Flyway no startup. O banco pode iniciar vazio desde que esteja acessivel pelas credenciais configuradas.

Variaveis esperadas no backend:

- `DATABASE_URL`
- `DATABASE_USER`
- `DATABASE_PASSWORD`
- `JWT_SECRET`
- `JWT_ACCESS_TOKEN_MINUTES`
- `CORS_ALLOWED_ORIGINS`
- `APP_FRONTEND_BASE_URL`
- `APP_PORTAL_CLIENT_PATH`
- `APP_PORTAL_DEFAULT_TTL_MINUTES`
- `APP_PORTAL_CLIENT_SESSION_MINUTES`
- `APP_DOCUMENT_DOWNLOAD_TOKEN_MINUTES`
- `APP_STORAGE_ENABLED`
- `APP_STORAGE_ENDPOINT`
- `APP_STORAGE_REGION`
- `APP_STORAGE_BUCKET`
- `APP_STORAGE_ACCESS_KEY`
- `APP_STORAGE_SECRET_KEY`
- `APP_STORAGE_PATH_STYLE`
- `APP_STORAGE_UPLOAD_URL_MINUTES`
- `APP_STORAGE_DOWNLOAD_URL_MINUTES`

## PostgreSQL

Responsabilidades:

- persistencia principal do sistema
- execucao das migracoes Flyway no startup do backend
- armazenamento de dados operacionais, sessoes, auditoria, workflow e metadados de documentos

Cuidados:

- validar formato do `DATABASE_URL` conforme o provedor
- garantir conectividade entre Railway e banco provisionado
- confirmar que o usuario possui permissao para criar extensoes e aplicar migracoes, quando exigido pelas migrations existentes

## Cloudflare R2

Configuracao esperada:

- endpoint S3-compatible no formato `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`
- bucket dedicado ao projeto
- access key e secret key gerenciadas fora do repositorio

Valores operacionais usuais:

- `APP_STORAGE_ENABLED=true`
- `APP_STORAGE_REGION=auto`
- `APP_STORAGE_PATH_STYLE=false`

## Cuidados comuns

- `VITE_API_URL`, `CORS_ALLOWED_ORIGINS` e `APP_FRONTEND_BASE_URL` precisam permanecer coerentes entre si
- divergencia de dominio ou protocolo entre frontend e backend costuma quebrar autenticacao e chamadas protegidas
- credenciais de R2 e banco nao devem ser versionadas
- healthcheck positivo nao substitui validacao funcional de login, casos e portal

## Validacao pos-deploy

Checklist minimo:

- backend responde em `GET /health`
- login administrativo funciona
- listagem de casos carrega no painel
- fluxo de clientes, parceiros e usuarios responde sem erro
- acesso ao portal do cliente funciona com link valido
- documentos podem ser listados e baixados
- integracao com storage responde sem erro de assinatura ou permissao

## Referencias

- [`environment.md`](environment.md)
- [`checklist-entrega.md`](checklist-entrega.md)
