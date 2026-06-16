# Dr. Auto - Oficinas (ERP Oficina Mecânica) — Visão Profissional do Projeto

Este documento descreve **o que já foi implementado**, **o que ainda é protótipo**, e **o que precisa ser feito** para evoluir o AutoCore para um ERP SaaS completo (multi-oficina), preservando o layout premium criado no Kimi.

## Objetivo do produto

Um ERP moderno para oficinas mecânicas (marca **Dr. Auto - Oficinas**) com:

- **Gestão interna** (clientes, veículos, OS, orçamentos, estoque, financeiro, agenda, relatórios)
- **Portal / WebApp do cliente** para aprovar orçamentos e acompanhar status
- **Comunicação** (WhatsApp + notificações PWA)
- **Fiscal** (NF-e via API fiscal)
- **SaaS multi-oficina** (multi-tenant) com planos e permissões

## O que já foi feito (estado atual)

### 1) Infra e execução local

- **Monorepo** com workspaces:
  - `app/` (ERP Web)
  - `apps/api/` (API NestJS)
  - `packages/database/` (Prisma + schema)
  - `packages/types/` (tipos compartilhados)
- **Docker Compose** com:
  - PostgreSQL 16 (porta `5432`)
  - Redis 7 (porta `6379`)
  - Arquivo: `docker-compose.yml`
- Scripts na raiz para rodar tudo:
  - `npm run dev` (API + Web)
  - `npm run start` (Docker + dev)

### 2) Banco de dados (Prisma) com multi-tenant

O banco já está preparado para múltiplas oficinas com **`organization_id`** nas entidades principais.

Principais tabelas já modeladas em `packages/database/prisma/schema.prisma`:

- **Acesso**: `users`, `profiles`, `roles`, `permissions`, `role_permissions`, `organization_members`
- **Estrutura**: `organizations`, `branches`
- **Negócio (base inicial)**: `customers`, `vehicles`, `service_orders`, `quotes`, `products`, `daily_revenues`, `audit_logs`

O seed em `packages/database/prisma/seed.ts` cria **apenas permissões globais** (sem oficina, usuário ou registros de negócio). A primeira oficina é cadastrada em `/cadastro`.

### 3) API (NestJS) — funcional para listagens e KPI

API modular (`apps/api/src`), com:

- **Auth JWT**: login, cadastro de oficina/empresa, `/me`
- **Permissões** (guard) e sessão com org/role/perms
- Endpoints de leitura/listagem:
  - Dashboard KPIs
  - Clientes, Veículos, OS, Orçamentos, Estoque
  - Admin stats (últimos acessos)

### 4) Frontend ERP (Vite + React) — layout preservado

O layout premium (Sidebar/Topbar/cards) foi mantido e agora o app tem **rotas reais**:

- Dashboard conectado a KPIs reais via API (React Query)
- Módulos com telas de lista (Clientes/Veículos/OS/Orçamentos/Estoque/Configurações/Admin/Agenda)
- Compras, Financeiro e Relatórios conectados à API
- NF-e, WhatsApp e CRM desabilitados (fora do menu)

## O que ainda é “protótipo” (e por quê)

### Módulos parciais

- Agenda (UI pronta; cadastro de agendamentos em evolução)
- Gráficos de serviços e formas de pagamento (aguardam lançamentos reais no financeiro/OS)

### Módulos desabilitados (fora do menu)

- NF-e
- WhatsApp
- CRM

### Ações “Novo / Editar / Detalhe”

As telas já exibem listas, mas muitos fluxos de CRUD e telas detalhadas ainda estão pendentes:

- Criar/editar cliente
- Criar/editar veículo
- Abrir OS completa (checklist, mídia, serviços/peças, timeline, assinatura)
- Criar orçamento e gerar link seguro para o WebApp do cliente

## Riscos e melhorias necessárias (para nível SaaS)

### 1) Segurança (prioridade alta)

- **Rate limit** no login e endpoints sensíveis
- **Reset de senha** e política de senha (ou migração para Supabase Auth)
- **Auditoria** expandida (CRUDs relevantes, alterações de status, emissão fiscal)

### 2) Isolamento multi-tenant consistente (prioridade alta)

Hoje usamos `organizationId` no JWT + filtros nas queries da API. Para SaaS real, garantir:

- Toda query sempre filtrada por `organizationId`
- Padrão para `branchId` quando entrar multifilial (UI + API)
- Preparar RLS no Supabase quando for migrar para cloud (opcional, mas recomendado)

### 3) Roadmap por módulo (prioridade alta → média)

Ordem recomendada para virar um produto funcional:

1. **Clientes** (CRUD completo + busca)
2. **Veículos** (CRUD + vínculo com cliente + foto via Storage futuramente)
3. **OS** (status, checklist, mídia, serviços, peças, valores)
4. **Orçamentos** (itens + aprovação + link seguro)
5. ~~**WebApp do cliente** (Fase 6)~~ — app separado `apps/portal` (`docs/FASE-6-PORTAL-PWA.md`, `docs/ARQUITETURA-FRONTEND.md`)
6. **WhatsApp + Notificações** (Fase 7; Redis para fila)
7. Estoque (movimentação por OS)
8. Financeiro (contas a pagar/receber + caixa)
9. Fiscal NF-e via API (Focus/TecnoSpeed/eNotas)
10. SaaS (planos/limites/módulos)

## Supabase (nuvem) — estratégia de migração

Existe um guia em `docs/MIGRACAO-SUPABASE.md`.

Conceito:

- **Local**: Postgres/Redis via Docker Compose + Prisma migrations
- **Cloud (Supabase)**: Postgres gerenciado + (opcional) Auth/Storage/RLS

Regras práticas:

- **Tabelas de negócio**: sempre via **Prisma migrations**
- **RLS/Storage/Auth triggers**: via `supabase/migrations/` (quando usar Supabase)

## Como rodar (desenvolvimento)

Pré-requisitos:

- Node.js 20+
- Docker Desktop

Comandos:

```powershell
cd "e:\SITES\DR AUTO ERP"
npm run start
```

Primeiro acesso (produção / homologação):

1. Suba o banco: `npm run db:up`
2. Aplique migrations e seed de sistema: `npm run db:deploy` e `npm run db:seed`
3. Cadastre a oficina em `http://localhost:3000/cadastro`
4. Entre no ERP em `http://localhost:3000/login`

O seed **não** cria usuários nem dados de negócio — apenas permissões globais.

## Padrões de UI/UX (não mexer no design)

Diretriz do projeto:

- **Preservar o layout premium** já aprovado (cards brancos, fundo claro, sidebar escura, acento azul petróleo).
- Implementações novas devem **reutilizar o mesmo padrão visual** (não reestilizar componentes existentes).

## Próximos passos recomendados (curto prazo)

- Implementar CRUD completo de **Clientes** e **Veículos** (form + validação + detalhes).
- Iniciar a **OS completa** (abas, timeline, checklist, upload de fotos/vídeos).
- Padronizar “Detalhe” via rotas: `/clientes/:id`, `/veiculos/:id`, `/os/:id`, `/orcamentos/:id`.
- Preparar Storage (local stub) e migração para Supabase Storage quando for cloud.

email utilizado para o projeto no github+supa+vercel

wtecmotors@gmail.com
Metron.87


