# Handoff Tecnico

## Escopo entregue

O repositorio contem uma aplicacao funcional com:

- painel administrativo web
- API backend dedicada
- persistencia em PostgreSQL
- armazenamento de documentos em storage S3-compatible
- portal do cliente com acesso temporario

## O que esta funcionando

Com base na estrutura e documentacao existente no repositorio, o sistema ja contempla:

- autenticacao administrativa
- operacao de casos no painel interno
- cadastro e manutencao de clientes
- cadastro e manutencao de parceiros
- cadastro e manutencao de usuarios internos
- portal do cliente com validacao de acesso
- listagem e download seguro de documentos
- recursos patrimoniais vinculados ao caso
- migracoes de banco via Flyway

## Dependencias externas

- Vercel para publicacao do frontend
- Railway para publicacao do backend
- PostgreSQL para persistencia
- Cloudflare R2 para armazenamento de documentos

## Como outro desenvolvedor pode assumir

1. Ler [`README.md`](../README.md) para visao geral e estrutura.
2. Ler [`architecture.md`](architecture.md) para contexto tecnico.
3. Ler [`environment.md`](environment.md) para mapear as variaveis.
4. Ler [`deploy.md`](deploy.md) para reproduzir publicacao e ambiente.
5. Validar localmente frontend, backend, banco e integracao de storage antes de qualquer mudanca.

## Pontos de atencao operacional

- o frontend depende de `VITE_API_URL` correto para funcionar em producao
- o backend depende de alinhamento entre URL publica do frontend e CORS
- documentos exigem storage configurado corretamente
- fluxos do portal do cliente dependem de token, TTL e sessao temporaria
- migracoes Flyway rodam no startup e exigem banco compativel e acessivel

## Credenciais e configuracoes fora do repositorio

Devem ser fornecidos separadamente:

- URL e credenciais do PostgreSQL
- `JWT_SECRET`
- credenciais do Cloudflare R2
- URL publica do frontend
- URL publica do backend
- configuracoes de projeto na Vercel e na Railway

## Riscos comuns de ambiente

- divergencia entre dominios configurados no frontend e permitidos no backend
- storage com endpoint, bucket ou credenciais incorretos
- banco sem permissao para aplicar migracoes
- deploy bem-sucedido sem validacao funcional ponta a ponta

## Continuidade

Checklist de continuidade para novo responsavel:

- confirmar acesso aos provedores Vercel, Railway, PostgreSQL e Cloudflare
- confirmar posse das variaveis de ambiente de producao
- validar healthcheck, login e fluxos centrais
- revisar branches `main` e `dev` como referencias de operacao
- manter qualquer mudanca futura acompanhada de atualizacao documental
