# Supabase — você já criou o projeto. E agora?

## 1. Pegar as strings no painel Supabase

Abra o projeto → **Project Settings** (engrenagem).

### Database

**Connect** → aba **ORM** ou **Connection string**:

| Variável | Onde pegar |
|----------|------------|
| `DATABASE_URL` | **Transaction pooler** · porta **6543** · modo **Session** ou URI com `?pgbouncer=true` |
| `DIRECT_URL` | **Direct connection** · porta **5432** |

Substitua `[YOUR-PASSWORD]` pela senha do banco (a que você definiu ao criar o projeto).

Se a senha tiver `@`, `#`, `%` etc., use a senha **URL-encoded** na connection string.

### API

**Project Settings → API**:

| Variável | Campo |
|----------|--------|
| `SUPABASE_URL` | Project URL |
| `SUPABASE_ANON_KEY` | anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role (não expor no frontend) |

## 2. Editar o `.env` na raiz do projeto

Abra `e:\SITES\DR AUTO ERP\.env` e troque todos os `[ref]`, `[password]`, `[region]`.

Gere um `JWT_SECRET` forte (32+ caracteres aleatórios).

Para testar local com Supabase:

```env
CORS_ORIGIN="http://localhost:3000"
VITE_API_URL="http://localhost:4000"
```

Para produção com Docker (`supabase:up`):

```env
CORS_ORIGIN="http://localhost:3000"
VITE_API_URL=""
```

## 3. Sincronizar para as pastas certas

```powershell
cd "e:\SITES\DR AUTO ERP"
npm run env:sync
```

Isso copia para `packages/database/.env`, `apps/api/.env` e atualiza `app/.env` com `VITE_*`.

## 4. Criar tabelas no Supabase

```powershell
npm run supabase:init
```

Deve terminar com: `Seed de sistema OK`.

## 5. Subir o sistema

**Opção A — desenvolvimento (sem Docker postgres):**

```powershell
npm run dev
```

**Opção B — containers (API + web + Redis, banco no Supabase):**

```powershell
npm run supabase:up
```

## 6. Primeiro acesso OFICINA DO BETO

1. http://localhost:3000/cadastro — **uma vez** (admin da OFICINA DO BETO)
2. Depois só http://localhost:3000/login
3. Portal cliente: http://localhost:3000/

## Problemas comuns

| Erro | Solução |
|------|---------|
| `Can't reach database` | IP liberado em Supabase → Database → Network (ou desative restrict) |
| Migration falha no pooler | Confirme `DIRECT_URL` na porta **5432** |
| `password authentication failed` | Senha errada ou não encoded na URL |
| Login não conecta | `npm run env:sync` e reinicie `npm run dev` |

## Checklist rápido

- [ ] `DATABASE_URL` (6543 + pgbouncer)
- [ ] `DIRECT_URL` (5432)
- [ ] `JWT_SECRET` preenchido
- [ ] `npm run env:sync`
- [ ] `npm run supabase:init` OK
- [ ] `/cadastro` feito uma vez
