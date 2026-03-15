# Arquitetura

## Visao geral

O projeto e composto por frontend SPA, backend API, banco PostgreSQL e storage externo para documentos. O frontend e publicado separadamente do backend, mas ambos compartilham o mesmo repositorio.

## Frontend

O frontend esta na raiz do repositorio e foi construido com React, TypeScript e Vite.

Responsabilidades principais:

- autenticacao administrativa
- navegacao das areas internas
- consumo da API de casos, clientes, parceiros e usuarios
- operacao do fluxo detalhado de casos
- acesso e validacao do portal do cliente

Rotas principais identificadas:

- `/` para login administrativo
- `/admin` para dashboard
- `/admin/caso/:id` para detalhamento de caso
- `/admin/clientes` para clientes
- `/admin/usuarios` para usuarios internos
- `/admin/parceiros` para parceiros
- `/portal/verificar` e `/client-portal/:token` para entrada do cliente
- `/portal/caso` para visualizacao do portal autenticado

## Backend

O backend esta em [`backend`](../backend/) e foi construido com Spring Boot.

Responsabilidades principais:

- autenticacao administrativa via JWT
- autorizacao de acesso a rotas internas
- gestao de clientes, parceiros, usuarios e casos
- workflow operacional de casos, etapas, subetapas e tarefas
- emissao e validacao de links temporarios do portal do cliente
- geracao de links assinados para upload e download de documentos
- aplicacao de migracoes Flyway no banco

## Comunicacao entre frontend e backend

- o frontend consome a API via `VITE_API_URL`
- o backend responde em HTTP e controla autenticacao, autorizacao e regras de exposicao ao cliente
- o portal do cliente depende de token temporario emitido pelo backend
- downloads de documentos passam por geracao de token temporario e resolucao de link assinado

## Banco de dados no ecossistema

O PostgreSQL e a fonte principal de persistencia do sistema.

Armazena, entre outros:

- usuarios internos
- clientes
- parceiros
- casos
- workflow de etapas e tarefas
- documentos e seus metadados
- links e sessoes do portal do cliente
- trilha de auditoria
- estrutura patrimonial

## Storage no ecossistema

O storage externo e usado para arquivos e documentos. Em producao, a referencia esperada e Cloudflare R2 com interface S3-compatible.

Responsabilidades:

- armazenar binarios de documentos
- permitir upload por URL assinada
- permitir download por URL assinada
- desacoplar o banco do armazenamento fisico de arquivos

## Fluxo do portal do cliente

1. Um link temporario de portal e emitido para um caso.
2. O cliente acessa o link e realiza validacao complementar.
3. O backend cria sessao temporaria do portal.
4. O frontend consome dados do caso, etapas, documentos e patrimonio permitidos.
5. Downloads dependem de token temporario e link assinado.

## Fluxo administrativo

1. Usuario interno autentica no painel.
2. O frontend consome a API autenticada.
3. A equipe opera clientes, parceiros, usuarios e casos.
4. Casos podem receber etapas, documentos, tarefas e dados patrimoniais.
5. O backend registra auditoria e persiste alteracoes no PostgreSQL.

## Observacoes para manutencao futura

- alteracoes em frontend e backend exigem alinhamento de CORS e URL publica
- rotas do portal exigem cuidado especial por envolver token, expiracao e sessao temporaria
- storage e banco sao dependencias externas criticas para os fluxos de documentos
- deploys devem sempre ser validados ponta a ponta, nao apenas pelo healthcheck
