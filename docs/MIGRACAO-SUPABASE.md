# Migração AutoCore → Supabase

## Pré-requisitos

- Schema aplicado localmente via Docker (`npm run db:migrate`)
- Projeto criado em [supabase.com](https://supabase.com)

## Passo a passo

### 1. Variáveis de ambiente

No painel Supabase → **Settings → Database**, copie:

| Variável | Uso |
|----------|-----|
| Connection pooling (6543) | `DATABASE_URL` — runtime da API |
| Direct connection (5432) | `DIRECT_URL` — `prisma migrate deploy` |

Em **Settings → API**:

- `SUPABASE_URL`
- `anon` → `SUPABASE_ANON_KEY` / `VITE_SUPABASE_ANON_KEY`
- `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (somente servidor)

### 2. Aplicar schema Prisma

```bash
# Na raiz, com .env apontando para Supabase
npm run db:deploy
```

### 3. Camada Supabase (RLS, Storage, Auth)

```bash
supabase link --project-ref SEU_PROJECT_REF
supabase db push
```

Arquivos em `supabase/migrations/`:

- RLS por `organization_id`
- Buckets: `vehicle-photos`, `os-media`, `documents`
- Trigger `auth.users` → `profiles` (quando migrar auth)

### 4. Dados de homologação (opcional)

```bash
pg_dump -h localhost -U autocore -d autocore -F c -f autocore_backup.dump
pg_restore -h db.[ref].supabase.co -U postgres -d postgres autocore_backup.dump
```

Ou rode `npm run db:seed` no ambiente cloud (apenas dev/staging).

### 5. Frontend

Ative `VITE_SUPABASE_URL` e troque login JWT local por Supabase Auth quando estiver pronto.

## Checklist

- [ ] `prisma migrate deploy` sem erros
- [ ] `supabase db push` aplicado
- [ ] Buckets criados com políticas
- [ ] API em produção com `DATABASE_URL` pooler
- [ ] `JWT_SECRET` / keys rotacionadas
