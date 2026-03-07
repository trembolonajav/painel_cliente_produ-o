# Backend - Painel Cliente

Base inicial de producao em Spring Boot + Postgres + Flyway.

## Stack
- Java 21
- Spring Boot 3.3
- Spring Security (JWT Bearer)
- Spring Data JPA
- Flyway
- PostgreSQL

## Estrutura atual
- `office_users`
- `clients`
- `cases`
- `case_members`
- `case_portal_links`
- `POST /auth/login`
- `GET /auth/me`
- `GET /health`
- `GET/POST/PATCH /clients`
- `GET/POST/PATCH /cases`
- `GET/POST /cases/{id}/members`
- `GET/POST /cases/{id}/updates`
- `GET/POST /cases/{id}/documents`
- `POST /cases/{id}/documents/presign`
- `POST /cases/{id}/documents/confirm`
- `POST /cases/{id}/documents/{documentId}/download-link`
- `GET /cases/{id}/portal-link`
- `POST /cases/{id}/portal-link/activate`
- `POST /cases/{id}/portal-link/revoke`
- `POST /client-portal/session` (`token + cpfLast3`)
- `GET /client-portal/me`
- `GET /client-portal/case`
- `GET /client-portal/updates` (somente `CLIENT_VISIBLE`)
- `GET /client-portal/documents` (somente `CLIENT_VISIBLE`)
- `POST /client-portal/documents/{documentId}/download-link`
- `POST /client-portal/patrimony/original-document/download-link`
- `POST /client-portal/logout`
- `GET /documents/download?token=...` (token temporario, uso unico)

## Banco local
Subir Postgres via Docker:

```bash
docker compose up -d postgres
```

Conexao default local:
- host: `localhost`
- porta: `5433`
- db: `painel_cliente`
- user: `postgres`
- senha: `607733%`

## Rodar API
```bash
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

API local: `http://localhost:8080`

## Usuario seed (somente profile dev)
- email: `admin@painel.local`
- senha: `Admin@123`

## Exemplo login
```bash
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@painel.local","password":"Admin@123"}'
```

## Variaveis importantes
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
- `APP_STORAGE_ENABLED`
- `APP_STORAGE_ENDPOINT`
- `APP_STORAGE_REGION`
- `APP_STORAGE_BUCKET`
- `APP_STORAGE_ACCESS_KEY`
- `APP_STORAGE_SECRET_KEY`
- `APP_STORAGE_PATH_STYLE`
- `APP_STORAGE_UPLOAD_URL_MINUTES`
- `APP_STORAGE_DOWNLOAD_URL_MINUTES`

## Proxima etapa recomendada
1. Integrar upload de documentos com storage externo (presigned URL).
2. Adicionar revogacao/listagem administrativa de sessoes do cliente.
3. Implementar endpoint de download seguro de documento do cliente.
4. Cobertura automatizada de testes de integração para auth/portal.

## Seguranca adicional implementada
- `audit_log` para rastrear ações de staff e cliente
- rate-limit no `POST /client-portal/session`:
  - bloqueio do link após 5 tentativas inválidas de CPF
  - bloqueio por 10 minutos (`Muitas tentativas. Aguarde alguns minutos.`)
- download seguro de documento:
  - token temporario com expiracao curta
  - uso unico (segunda tentativa falha)
  - resolucao gera URL assinada S3/MinIO para download real
