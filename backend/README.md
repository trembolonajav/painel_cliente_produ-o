# Backend - Painel do Cliente

Backend API em Spring Boot responsavel por autenticacao administrativa, operacao de casos, portal do cliente, persistencia em PostgreSQL e integracao com storage de documentos.

## Stack

- Java 21
- Spring Boot 3
- Spring Security
- Spring Data JPA
- Flyway
- PostgreSQL
- AWS SDK S3-compatible

## Responsabilidades

- autenticar usuarios internos
- expor endpoints administrativos e do portal do cliente
- aplicar migracoes de banco no startup
- controlar links temporarios e sessoes do portal
- gerar URLs assinadas para upload e download de documentos

## Execucao local

### Banco

O repositorio inclui [`docker-compose.yml`](docker-compose.yml) para apoio ao ambiente local.

```bash
docker compose up -d postgres
```

### API

```bash
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

URL local padrao:

- `http://localhost:8080`

## Variaveis de ambiente

Principais variaveis do backend:

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

Detalhamento completo:

- [`docs/environment.md`](../docs/environment.md)

## Operacao

- o healthcheck esperado esta em `/health`
- migracoes Flyway executam no startup
- o backend deve ser publicado na Railway com root directory `backend`
- o frontend publicado deve estar refletido em `CORS_ALLOWED_ORIGINS` e `APP_FRONTEND_BASE_URL`

## Documentacao complementar

- [`docs/architecture.md`](../docs/architecture.md)
- [`docs/deploy.md`](../docs/deploy.md)
- [`docs/handoff.md`](../docs/handoff.md)
