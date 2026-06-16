# Supabase — migração direta (produção)

**Deploy atual:** instância dedicada **OFICINA DO BETO** (uma empresa por projeto Supabase).

Guia da OFICINA DO BETO: [INSTALACAO-OFICINA-DO-BETO.md](./INSTALACAO-OFICINA-DO-BETO.md)

Use o **Postgres do Supabase** como banco principal. O Docker local fica só para desenvolvimento, se quiser.

## O que continua igual

| Item | Hoje |
|------|------|
| Tabelas | Prisma migrations (`packages/database/prisma/migrations`) |
| API | NestJS + JWT (login em `/cadastro` e `/login`) |
| Frontend | Vite/React (sem Supabase Auth ainda) |

## O que o Supabase adiciona agora

- Postgres gerenciado (backup, SSL, pooler)
- Buckets de Storage (`vehicle-photos`, `os-media`, `documents`) após `supabase db push`
- Base para Auth/RLS depois (opcional)

## Passo a passo

### 1. Criar projeto no [supabase.com](https://supabase.com)

Anote: **Project ref**, **Database password**, **Region**.

### 2. Configurar `.env`

```powershell
copy .env.supabase.example .env
copy .env packages\database\.env
copy .env apps\api\.env
```

Preencha `DATABASE_URL` (pooler **6543**) e `DIRECT_URL` (direct **5432**) em **Settings → Database**.

Gere um `JWT_SECRET` forte (32+ caracteres).

### 3. Aplicar schema e permissões

Com `.env` apontando para o Supabase:

```powershell
cd "e:\SITES\DR AUTO ERP"
npm run supabase:init
```

Isso roda `prisma migrate deploy` + seed (só permissões globais, sem dados demo).

### 4. Storage (opcional)

Com [Supabase CLI](https://supabase.com/docs/guides/cli) instalada:

```powershell
supabase login
supabase link --project-ref SEU_PROJECT_REF
supabase db push
```

### 5. Subir API + Web (sem Postgres no Docker)

```powershell
npm run supabase:up
```

Acesse:

- Portal: `http://localhost:3000/`
- ERP: `http://localhost:3000/cadastro` → depois `/login`

### 6. Primeira oficina

Cadastre em **/cadastro** — não há usuário demo.

## Checklist

- [ ] `DATABASE_URL` usa pooler (6543) com `?pgbouncer=true`
- [ ] `DIRECT_URL` usa conexão direct (5432) para migrations
- [ ] `npm run supabase:init` sem erro
- [ ] `JWT_SECRET` único em produção
- [ ] `CORS_ORIGIN` com domínio real
- [ ] Firewall Supabase: permitir IP do servidor (se restrict)

## Desenvolvimento local vs nuvem

| Ambiente | Banco |
|----------|--------|
| Dev local | `docker compose up` + `.env` localhost |
| Produção | Supabase + `docker-compose.supabase.yml` |

Não é obrigatório manter dois bancos em produção — pode usar **só Supabase** e, se quiser, outro projeto Supabase para staging.

## Próxima fase (não obrigatória agora)

- Supabase Auth (substituir JWT Nest gradualmente)
- RLS por `organization_id` nas tabelas sensíveis
- Upload de fotos da OS no Storage

Guia complementar: [MIGRACAO-SUPABASE.md](./MIGRACAO-SUPABASE.md)

**Deploy na Vercel:** [DEPLOY-VERCEL.md](./DEPLOY-VERCEL.md)
