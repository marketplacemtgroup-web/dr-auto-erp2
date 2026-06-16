# OFICINA DO BETO — ERP OFICINA MECÂNICA

Monorepo com frontend Vite (design Kimi preservado), API NestJS, PostgreSQL via Docker e caminho de migração para Supabase.

## Pré-requisitos

- Node.js 20+
- Docker Desktop

## Início rápido

```powershell
cd "e:\SITES\DR AUTO ERP"
docker compose up -d
npm install
copy .env.example .env
npm run db:migrate
npm run db:seed
```

Um comando só (API + frontend):

```powershell
npm run dev
```

Se aparecer `EADDRINUSE` na porta 4000, libere as portas e tente de novo:

```powershell
npm run dev:free
npm run dev
```

Sobe Postgres/Redis e depois API + frontend:

```powershell
npm run start
```

- ERP: http://localhost:3000
- API: http://localhost:4000/api
- Primeira oficina: cadastre em http://localhost:3000/cadastro
- Portal do cliente: http://localhost:3000/ (login com CPF + placa do veículo cadastrado)

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run db:up` | Sobe Postgres + Redis |
| `npm run db:migrate` | Prisma migrate dev |
| `npm run db:seed` | Permissões de sistema (sem dados de negócio) |
| `npm run db:init` | Deploy migrations + seed de sistema |
| `npm run db:deploy` | Migrate em produção (Supabase) |
| `npm run dev` | API + frontend juntos |
| `npm run start` | Docker + API + frontend |
| `npm run dev:web` | Só frontend |
| `npm run dev:api` | Só backend NestJS |

## Migração Supabase

Ver [docs/MIGRACAO-SUPABASE.md](docs/MIGRACAO-SUPABASE.md).

## Estrutura

- `app/` — ERP web (Vite + React)
- `apps/api/` — API NestJS
- `packages/database/` — Prisma + PostgreSQL
- `packages/types/` — Tipos compartilhados
- `supabase/migrations/` — RLS e Storage (nuvem)
