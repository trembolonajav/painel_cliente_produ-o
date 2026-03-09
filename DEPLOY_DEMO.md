# Deploy De Demonstracao (Vercel + Railway + Cloudflare R2)

## Arquitetura alvo
- Frontend: Vercel
- Backend: Railway (servico Java Spring Boot)
- Banco: PostgreSQL do Railway
- Storage: Cloudflare R2 (S3-compatible)

## 1) Backend no Railway

### Root Directory
- `backend`

### Build/Start
- Build: Nixpacks (automatico)
- Start: `java -jar target/painel-api-0.0.1-SNAPSHOT.jar`
- Healthcheck: `/health`

### Variaveis de ambiente (backend)
- `PORT` (fornecida pelo Railway)
- `DATABASE_URL`
- `DATABASE_USER` (opcional se `DATABASE_URL` ja tiver credenciais)
- `DATABASE_PASSWORD` (opcional se `DATABASE_URL` ja tiver credenciais)
- `JWT_SECRET` (obrigatoria)
- `JWT_ACCESS_TOKEN_MINUTES` (opcional, default `120`)
- `CORS_ALLOWED_ORIGINS` (obrigatoria, separar por virgula)
- `APP_FRONTEND_BASE_URL` (obrigatoria, URL publica do Vercel)
- `APP_PORTAL_CLIENT_PATH` (opcional, default `/client-portal`)
- `APP_PORTAL_DEFAULT_TTL_MINUTES` (opcional, default `1440`)
- `APP_PORTAL_CLIENT_SESSION_MINUTES` (opcional, default `120`)
- `APP_DOCUMENT_DOWNLOAD_TOKEN_MINUTES` (opcional, default `5`)
- `APP_STORAGE_ENABLED` (recomendado `true`)
- `APP_STORAGE_ENDPOINT` (R2 S3 endpoint)
- `APP_STORAGE_REGION` (R2: `auto`)
- `APP_STORAGE_BUCKET`
- `APP_STORAGE_ACCESS_KEY`
- `APP_STORAGE_SECRET_KEY`
- `APP_STORAGE_PATH_STYLE` (R2 recomendado `false`)
- `APP_STORAGE_UPLOAD_URL_MINUTES` (opcional, default `10`)
- `APP_STORAGE_DOWNLOAD_URL_MINUTES` (opcional, default `5`)

## 2) Cloudflare R2

Use um endpoint S3 compatível neste formato:
- `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`

Valores recomendados para R2:
- `APP_STORAGE_ENABLED=true`
- `APP_STORAGE_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com`
- `APP_STORAGE_REGION=auto`
- `APP_STORAGE_BUCKET=<bucket>`
- `APP_STORAGE_ACCESS_KEY=<access-key>`
- `APP_STORAGE_SECRET_KEY=<secret-key>`
- `APP_STORAGE_PATH_STYLE=false`

## 3) Frontend no Vercel

### Root Directory
- raiz do repositorio

### Build
- Build Command: `npm run build`
- Output Directory: `dist`

### Variavel de ambiente (frontend)
- `VITE_API_URL=https://<backend>.up.railway.app`

### SPA routes
Arquivo `vercel.json` ja incluido com rewrite para `index.html`.

## 4) Banco PostgreSQL no Railway

As migrations Flyway executam no startup do backend.
Banco pode iniciar vazio.

## 5) Primeiro admin (manual via SQL)

### Tabela
- `office_users`

### Campos minimos relevantes
- `id` (UUID)
- `name`
- `email` (UNIQUE)
- `password_hash` (BCrypt)
- `role` (`ADMINISTRADOR`)
- `is_active` (`true`)
- `created_at`
- `updated_at`

### Gerar hash BCrypt no proprio Postgres
O projeto habilita `pgcrypto` na migration V1, entao voce pode gerar hash assim:

```sql
SELECT crypt('SUA_SENHA_FORTE', gen_salt('bf', 10));
```

### Insert exemplo
```sql
INSERT INTO office_users (
  id, name, email, password_hash, role, is_active, created_at, updated_at
)
VALUES (
  gen_random_uuid(),
  'Administrador',
  'admin@empresa.com',
  crypt('Admin@123', gen_salt('bf', 10)),
  'ADMINISTRADOR',
  true,
  now(),
  now()
);
```

## 6) Ordem recomendada de publicacao
1. Criar Postgres no Railway
2. Criar servico backend no Railway (root `backend`) + envs
3. Validar `GET /health`
4. Criar bucket e credenciais no R2 + preencher envs de storage
5. Subir frontend no Vercel + `VITE_API_URL`
6. Ajustar `CORS_ALLOWED_ORIGINS` e `APP_FRONTEND_BASE_URL`
7. Criar admin manual via SQL
