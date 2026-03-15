# Ambiente

## Objetivo

Este documento lista as variaveis de ambiente identificadas no repositorio, seu uso e sua classificacao. Nenhum segredo real deve ser armazenado aqui.

## Frontend

### `VITE_API_URL`

- camada: frontend
- obrigatoria: sim, em producao
- uso: URL base da API consumida pelo frontend
- observacao: deve apontar para a URL publica do backend

## Backend

### `PORT`

- camada: backend
- obrigatoria: nao
- uso: porta HTTP do servico
- observacao: normalmente fornecida pela Railway

### `DATABASE_URL`

- camada: backend / banco
- obrigatoria: sim
- uso: string de conexao com o PostgreSQL

### `DATABASE_USER`

- camada: backend / banco
- obrigatoria: condicional
- uso: usuario do banco quando nao incorporado ao `DATABASE_URL`

### `DATABASE_PASSWORD`

- camada: backend / banco
- obrigatoria: condicional
- uso: senha do banco quando nao incorporada ao `DATABASE_URL`

### `JWT_SECRET`

- camada: backend
- obrigatoria: sim
- uso: assinatura e validacao de tokens JWT administrativos

### `JWT_ACCESS_TOKEN_MINUTES`

- camada: backend
- obrigatoria: nao
- uso: tempo de vida do token JWT administrativo

### `CORS_ALLOWED_ORIGINS`

- camada: backend
- obrigatoria: sim
- uso: lista de origens permitidas para consumo do backend
- observacao: separar multiplas origens por virgula

### `APP_FRONTEND_BASE_URL`

- camada: backend
- obrigatoria: sim
- uso: URL publica do frontend usada na emissao de links do portal

### `APP_PORTAL_CLIENT_PATH`

- camada: backend
- obrigatoria: nao
- uso: caminho base do portal do cliente

### `APP_PORTAL_DEFAULT_TTL_MINUTES`

- camada: backend
- obrigatoria: nao
- uso: validade padrao do link temporario do portal

### `APP_PORTAL_CLIENT_SESSION_MINUTES`

- camada: backend
- obrigatoria: nao
- uso: duracao da sessao do cliente no portal

### `APP_DOCUMENT_DOWNLOAD_TOKEN_MINUTES`

- camada: backend
- obrigatoria: nao
- uso: tempo de vida do token temporario de download

### `APP_STORAGE_ENABLED`

- camada: backend / storage
- obrigatoria: sim, quando houver documentos em storage externo
- uso: habilita integracao com storage S3-compatible

### `APP_STORAGE_ENDPOINT`

- camada: backend / storage
- obrigatoria: sim, quando `APP_STORAGE_ENABLED=true`
- uso: endpoint do provedor S3-compatible

### `APP_STORAGE_REGION`

- camada: backend / storage
- obrigatoria: sim, quando `APP_STORAGE_ENABLED=true`
- uso: regiao do storage
- observacao: em Cloudflare R2 o valor esperado e `auto`

### `APP_STORAGE_BUCKET`

- camada: backend / storage
- obrigatoria: sim, quando `APP_STORAGE_ENABLED=true`
- uso: bucket de armazenamento de documentos

### `APP_STORAGE_ACCESS_KEY`

- camada: backend / storage
- obrigatoria: sim, quando `APP_STORAGE_ENABLED=true`
- uso: credencial de acesso ao storage

### `APP_STORAGE_SECRET_KEY`

- camada: backend / storage
- obrigatoria: sim, quando `APP_STORAGE_ENABLED=true`
- uso: segredo de acesso ao storage

### `APP_STORAGE_PATH_STYLE`

- camada: backend / storage
- obrigatoria: nao
- uso: define o modo de enderecamento do bucket
- observacao: para Cloudflare R2 o valor operacional esperado e `false`

### `APP_STORAGE_UPLOAD_URL_MINUTES`

- camada: backend / storage
- obrigatoria: nao
- uso: validade da URL assinada de upload

### `APP_STORAGE_DOWNLOAD_URL_MINUTES`

- camada: backend / storage
- obrigatoria: nao
- uso: validade da URL assinada de download

## Classificacao por grupo

Frontend:

- `VITE_API_URL`

Backend:

- `PORT`
- `JWT_SECRET`
- `JWT_ACCESS_TOKEN_MINUTES`
- `CORS_ALLOWED_ORIGINS`
- `APP_FRONTEND_BASE_URL`
- `APP_PORTAL_CLIENT_PATH`
- `APP_PORTAL_DEFAULT_TTL_MINUTES`
- `APP_PORTAL_CLIENT_SESSION_MINUTES`
- `APP_DOCUMENT_DOWNLOAD_TOKEN_MINUTES`

Banco:

- `DATABASE_URL`
- `DATABASE_USER`
- `DATABASE_PASSWORD`

Storage:

- `APP_STORAGE_ENABLED`
- `APP_STORAGE_ENDPOINT`
- `APP_STORAGE_REGION`
- `APP_STORAGE_BUCKET`
- `APP_STORAGE_ACCESS_KEY`
- `APP_STORAGE_SECRET_KEY`
- `APP_STORAGE_PATH_STYLE`
- `APP_STORAGE_UPLOAD_URL_MINUTES`
- `APP_STORAGE_DOWNLOAD_URL_MINUTES`

## Observacoes operacionais

- valores reais devem ser fornecidos fora do repositorio
- coerencia entre frontend publicado e CORS do backend e obrigatoria
- qualquer rotacao de credenciais de banco ou storage deve ser refletida no provedor de deploy correspondente
