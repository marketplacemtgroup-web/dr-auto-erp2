# Prompt e especificação completa — mudanças OFICINA DO BETO

Documento **explicativo e reutilizável** para replicar este conjunto de funcionalidades em outros projetos de ERP de oficina (NestJS + React + Portal separado + Prisma + Vercel).

**Última atualização:** junho/2026  
**Escopo:** tudo implementado/ajustado neste ciclo — fornecedores/compras, financeiro, OS, portal, deploy, rebranding e **complemento de orçamento**.

---

## Índice

1. [Visão geral da arquitetura](#1-visão-geral-da-arquitetura)
2. [Instância dedicada e rebranding](#2-instância-dedicada-e-rebranding)
3. [Deploy Vercel (API + ERP + Portal)](#3-deploy-vercel-api--erp--portal)
4. [URLs do portal e links WhatsApp](#4-urls-do-portal-e-links-whatsapp)
5. [Fornecedores e compras](#5-fornecedores-e-compras)
6. [Financeiro ampliado](#6-financeiro-ampliado)
7. [Estoque, OS e lucro real](#7-estoque-os-e-lucro-real)
8. [Ordem de Serviço — histórico e impressão](#8-ordem-de-serviço--histórico-e-impressão)
9. [Dashboard, busca global e relatórios](#9-dashboard-busca-global-e-relatórios)
10. [Complemento de orçamento (feature principal)](#10-complemento-de-orçamento-feature-principal)
11. [Portal do cliente — complemento](#11-portal-do-cliente--complemento)
12. [Notificações push](#12-notificações-push)
13. [Modelo de dados (conceitual)](#13-modelo-de-dados-conceitual)
14. [Bugs corrigidos e lições](#14-bugs-corrigidos-e-lições)
15. [Checklist de deploy](#15-checklist-de-deploy)
16. [Pendências e melhorias futuras](#16-pendências-e-melhorias-futuras)
17. [Prompt único para outro projeto](#17-prompt-único-para-outro-projeto)
18. [Arquivos principais](#18-arquivos-principais)

---

## 1. Visão geral da arquitetura

Sistema monorepo com **três frontends** e uma API:

| Camada | Pasta | Quem usa | Função |
|--------|-------|----------|--------|
| **ERP** | `app/` | Equipe da oficina | OS, orçamentos, estoque, financeiro, compras, relatórios |
| **API** | `apps/api/` | Backend | Regras de negócio, Prisma, JWT, portal, push |
| **Portal** | `apps/portal/` | Cliente final | Acompanhar OS, aprovar orçamentos, notificações |
| **Database** | `packages/database/` | Prisma | Schema, migrations, seed |

**Princípio de instância:** uma oficina por deploy (um Supabase, três projetos Vercel, uma marca).

**URLs típicas em produção:**

- API: `https://oficina-beto-api.vercel.app`
- ERP: `https://oficina-beto-erp.vercel.app`
- Portal: `https://oficina-beto-portal.vercel.app`

Documentação relacionada: `NOVA-INSTANCIA-OFICINA.md`, `docs/DEPLOY-VERCEL.md`, `docs/PORTAL-DO-CLIENTE-VERCEL.md`, `docs/ARQUITETURA-FRONTEND.md`.

---

## 2. Instância dedicada e rebranding

### Objetivo

Migrar de marca genérica/antiga (ex.: WTEC Motors, Dr. Auto) para instância **OFICINA DO BETO** — nome, logos, textos e variáveis de ambiente alinhados.

### O que alterar

| Área | Arquivos / itens |
|------|------------------|
| HTML / PWA | `app/index.html`, `apps/portal/index.html`, `manifest.webmanifest` |
| Vite | `app/vite.config.ts`, `apps/portal/vite.config.ts` (nome do app, PWA) |
| Branding | `app/src/lib/branding.ts`, `apps/portal/src/lib/branding.ts` |
| Impressão | `PrintOrgHeader`, `PrintLegalTerms`, `printBranding.ts`, relatórios |
| API | `auth.service.ts`, `push.service.ts`, mensagens padrão |
| Portal SW | `apps/portal/public/push-sw.js` |
| Docs / scripts | `README.md`, `PROJETO.md`, `docs/INSTALACAO-OFICINA-DO-BETO.md`, `RENOMEAR-PASTA-WTECMOTORS.ps1` |
| Assets | `app/public/logo-oficinadobeto.png`, logos do portal |

### Variáveis de ambiente (ERP)

```env
VITE_APP_NAME="OFICINA DO BETO"
VITE_APP_TAGLINE="OFICINA MECANICA"
VITE_SINGLE_TENANT="true"
VITE_DEFAULT_ORGANIZATION_NAME="OFICINA DO BETO"
VITE_PORTAL_URL="https://oficina-beto-portal.vercel.app"
VITE_CONTACT_WHATSAPP="5511999999999"   # opcional
```

### O que manter de propósito (compatibilidade)

- `LEGACY_LOGO_URLS` — ignora logos antigos (`/logo-wtecmotors.png`, etc.)
- `LEGACY_PORTAL_URLS` — substitui domínios antigos do portal em `routes.ts`

### Regra de branding

Toda URL de logo passa por `resolveBrandingLogoUrl()` — URLs legadas caem no logo novo do deploy.

---

## 3. Deploy Vercel (API + ERP + Portal)

### Problema resolvido

Domínio do portal (`oficina-beto-portal.vercel.app`) servia o **ERP** (login e-mail/senha) porque o **Root Directory** na Vercel apontava para `app/` em vez de `apps/portal/`.

### Configuração correta

| Projeto Vercel | Root Directory |
|----------------|----------------|
| API | `apps/api` |
| ERP | `app` |
| Portal | `apps/portal` |

### Ordem de deploy

1. **API** (migrations aplicadas no Supabase)
2. **Portal** (`VITE_API_URL` apontando para a API)
3. **ERP** (`VITE_API_URL` + `VITE_PORTAL_URL`)

### Validação

- Portal: login CPF+placa ou link `/acesso/{token}` — **não** tela de login do ERP
- ERP: módulos administrativos, equipe
- Links WhatsApp abrem o portal, não o ERP

---

## 4. URLs do portal e links WhatsApp

### Problema resolvido

Links gerados pelo ERP usavam URL legada (`oficinadobeto-portal`, `wtecmotors-portal`, etc.) e quebravam para o cliente.

### Solução — centralizar no ERP (`app/src/lib/routes.ts`)

```typescript
portalBaseUrl()              // base do portal em produção
portalAccessUrl(token)       // {base}/acesso/{token}
portalPublicQuoteUrl(token)  // {base}/orcamento/{token}
portalLoginUrl()             // {base}/login
```

- Lê `VITE_PORTAL_URL` do `.env`
- Fallback: `PORTAL_PUBLIC_BASE_URL` em código
- Ignora URLs em `LEGACY_PORTAL_URLS`

### Regra

**Nunca** hardcodar domínio do portal em páginas de OS, orçamento ou WhatsApp — sempre `portalBaseUrl()`.

### Alerta na UI

Se a URL não começar com `http`, exibir: *"Configure VITE_PORTAL_URL no .env"*.

---

## 5. Fornecedores e compras

### Migration

`packages/database/prisma/migrations/20260616160000_suppliers_purchases_finance/`

**Novas tabelas:**

| Tabela | Função |
|--------|--------|
| `suppliers` | Cadastro de fornecedores |
| `purchase_order_items` | Itens da compra |
| `financial_categories` | Categorias receita/despesa |
| `payment_fee_configs` | Taxa % por forma de pagamento |
| `payment_fee_records` | Taxa efetiva na baixa |

**Tabelas expandidas:** `purchase_orders`, `products`, `stock_movements`, `financial_entries`, `service_order_items` (`unitCost`).

### API — Fornecedores (`/suppliers`)

- CRUD completo + `GET /suppliers/:id/profile` (KPIs, compras recentes, AP em aberto)
- Permissão: `suppliers.manage`

### API — Compras (`/purchases`)

| Endpoint | Função |
|----------|--------|
| `POST /purchases` | Rascunho com itens |
| `PATCH /purchases/:id` | Editar (só rascunho) |
| `PATCH /purchases/:id/confirm` | Confirmar + gerar AP + opcional estoque |
| `PATCH /purchases/:id/receive` | Recebimento total/parcial |
| `PATCH /purchases/:id/cancel` | Cancelar (estorna AP aberta + estoque) |

**Body em `confirm`:**

```json
{
  "postToStock": true,
  "autoCreateProducts": true
}
```

- `postToStock` (padrão `true`) — lança estoque na hora
- `autoCreateProducts` (padrão `true`) — cria produto se item sem vínculo (busca por nome case-insensitive)

**Regras:**

- Rascunho: sem estoque, sem financeiro
- Confirmar: contas a pagar via `FinancialService.createFromPurchase()`
- Receber: movimento `IN` + custo médio ponderado
- Frete/despesas rateados proporcionalmente ao valor dos itens
- Cancelar: cancela parcelas `OPEN` + estorno de estoque se já recebido

### ERP — Telas

- **Fornecedores** (`/dashboard/fornecedores`) — lista + detalhe com abas Dados / Histórico
- **Compras** — wizard 5 etapas: Fornecedor → Itens → Frete → Pagamento → Revisão
- Checkbox **"Lançar no estoque agora"** (marcado por padrão)
- Botão: **"Registrar compra e lançar no estoque"**
- Lista: ações **Receber** e **Cancelar**

### Fluxo simplificado para o usuário

1. Compras → Nova compra  
2. Fornecedor → Itens (nome, qtd, custo — não precisa cadastrar produto antes)  
3. Frete → Pagamento (deixar estoque marcado)  
4. Registrar → gera AP + entra no estoque (cria produto se não existir)

---

## 6. Financeiro ampliado

### Integração com compras

- `createFromPurchase()` — parcelas PAYABLE vinculadas a fornecedor e compra
- `origin` em lançamentos (`PURCHASE`, OS, manual, etc.)
- Categorias padrão criadas na primeira compra (`ensureDefaultCategories`)

### Baixa de contas

- **PAYABLE:** juros, multa; saída no caixa se pagamento em dinheiro
- **RECEIVABLE:** taxa de cartão → `PaymentFeeRecord`
- Modal de baixa ampliado (`PayEntryModal.tsx`)

### Exclusão de lançamento

- `DELETE /financial/:id` com body `{ reason: string }` (motivo obrigatório)
- UI: `DeleteEntryModal.tsx` na `FinancialPage`
- Auditoria: evento `financial.delete`
- Remove movimentos de caixa e parcelas filhas quando aplicável

### Listagem

- Filtros: `origin`, `supplierId`
- Colunas: OS / Compra / Fornecedor / origem
- Períodos: dia, semana, mês, ano (`financialPeriod.ts`)

### O que não é apagado automaticamente

- OS finalizada permanece no histórico (soft delete manual)
- Conta paga permanece como "Pago" — exclusão só com motivo explícito

---

## 7. Estoque, OS e lucro real

### Estoque

- Movimentos exibem **origem** (compra ou OS) na API e na tela
- Vínculo `purchaseOrderId`, `unitCost`, `totalCost` em `stock_movements`
- Produtos: `averageCost`, `lastPurchaseCost`, `lastPurchaseAt`, `lastSupplierId`

### OS — custo nas peças

- Ao adicionar peça na OS: grava `unitCost` (snapshot do custo médio na hora)
- Relatórios usam `unitCost` para **lucro real de peças** (não só preço de venda)

### Relatórios

- Lucro peças / serviços / total
- Compras por fornecedor
- Juros e taxas no financeiro
- KPIs financeiros extraídos para componentes (`reportFinancialKpis.ts`)

---

## 8. Ordem de Serviço — histórico e impressão

### Lista de OS (`ServiceOrdersPage`)

- Abas **Em andamento** | **Histórico**
- Histórico: OS **Finalizadas** e **Entregues**
- Clique na linha → abre detalhe
- Botões **Abrir** e **Imprimir** por linha

### Detalhe da OS (`ServiceOrderDetailPage`)

- Suporte a `?print=1` — abre impressão automaticamente ao carregar
- Abas: Dados, Equipe, **Orçamento**, Itens, Checklist, Mídia, Timeline
- Impressão de OS e orçamento (`QuotePrintSheet`, branding da org)

### Veículo

- Aba **Histórico OS** — botão **Imprimir** em cada serviço passado

### Impressão / branding

- Cabeçalho com logo e endereço da filial (`format-branch-address.ts`, settings da org)
- Termos legais configuráveis

---

## 9. Dashboard, busca global e relatórios

### Dashboard (`DashboardPage.tsx`)

- KPIs operacionais e financeiros (React Query)
- Saudação por horário (`timeGreeting.ts` — Bom dia / Boa tarde / Boa noite)
- Nome da organização e branding
- Gráficos: receita, serviços, formas de pagamento
- OS recentes, orçamentos pendentes, agenda do dia, alertas

### Busca global (`GlobalSearchDialog`)

- Atalho na topbar (ERP)
- `GET /search?q=...` — busca clientes, veículos, OS, orçamentos
- Permissões: quem tem acesso a pelo menos um módulo listado

### Relatórios

- Modo TV (`ReportsTvMode.tsx`)
- KPIs financeiros padronizados (`buildReportFinancialKpiItems`)
- Comparação período anterior (variação %)

---

## 10. Complemento de orçamento (feature principal)

### Problema de negócio

Durante execução da OS (ex.: rolamento já aprovado), surge necessidade de mais itens (ex.: pastilha). A solução é **complementar o mesmo orçamento na mesma OS**, com aprovação parcial por linha.

### Princípios

- **Um orçamento, um número** — não criar orçamento paralelo
- **Mesma OS** — novos itens entram na OS existente
- **Aprovação por linha** — campo `approved`: `true` | `false` | `null`
- **Complemento** = linhas `approved=true` **e** linhas `approved=null` simultaneamente
- Reabertura **não notifica** o cliente — notificação ao **gerar link** ("Enviar complemento")

### Status da OS permitidos para complemento

```
IN_PROGRESS | APPROVED | AWAITING_PART
```

### Fluxo de estados do orçamento

```
DRAFT → PENDING → APPROVED
                      ↓ (Aumentar orçamento)
                   PENDING (complemento)
                      ↓ (aprovar novos itens)
                   APPROVED
```

### Backend — `QuotesSyncService`

**`syncQuoteLines`**

- Upsert por `serviceOrderItemId`
- Preserva `approved` em linhas existentes
- Linhas novas: `approved=null`
- Remove linhas órfãs
- Recalcula `amount`
- Se `APPROVED` + linhas pendentes → auto `PENDING`

**`isSupplementQuote(quoteId)`** — tem aprovadas E pendentes

**`reopenForSupplement`**

- Pré: orçamento `APPROVED`, OS em status permitido
- Transação:
  - `quote.status = PENDING`
  - Linhas com `approved=null` → `approved=true` (normalizar antigas)
  - Histórico OS: *"Complemento de orçamento solicitado"*
- Retorna `quoteId`

**`ensureSupplementBeforeItemSync`** — ao adicionar item na OS em execução, reabre automaticamente se há orçamento `APPROVED` sem `PENDING`

### Endpoint

```
POST /api/quotes/:id/reopen-supplement
Permissão: quotes.manage
Body: {}
Resposta: orçamento com status PENDING
```

### Aprovação / recusa (oficina e portal)

**Aprovar**

- Complemento: aprova só linhas `approved=null` (ou payload por linha)
- Recalcula valor com linhas aprovadas
- OS permanece `IN_PROGRESS`

**Recusar**

- Complemento: recusa/remove só itens novos
- Itens `approved=true` intactos
- Orçamento volta `APPROVED` se não há mais pendentes

### ERP — Aba Orçamento na OS

**Botão "Aumentar orçamento"**

- Visível: orçamento `APPROVED`, sem complemento aberto, OS em status permitido
- Ao clicar:
  1. `POST reopen-supplement`
  2. Abre drawer **"Novo item no orçamento"** imediatamente
  3. Estado `supplementUnlocked`
  4. Refetch em background
  5. Erro → `alert` + reverte estado

**Helpers frontend**

```typescript
getActiveQuote()    // PENDING > DRAFT > APPROVED
getApprovedQuote()  // para o botão aumentar
isSupplementQuote() // approved=true E approved=null
```

**Tabela de itens**

- Coluna Status por linha
- Editar/remover só linhas não aprovadas
- Ações: **Enviar complemento**, **Aprovar itens novos**, **Recusar itens novos**

**Link de compartilhamento**

- Só orçamentos `PENDING`
- Detecta complemento para push diferenciado (`quote.supplement`)

### Fluxo operacional recomendado

```
1. Aumentar orçamento
2. Adicionar peça/serviço novo
3. Enviar complemento (WhatsApp) OU aprovar manualmente na oficina
4. Cliente aprova no portal
```

---

## 11. Portal do cliente — complemento

### Onde o cliente vê

- **Home** — seção "Aguardando sua aprovação"
- **Detalhe da OS** — orçamento em destaque
- **Link direto** — `/orcamento/{token}`

### UI (`QuoteDetailContent`, `QuoteActionCard`)

Quando `isSupplement`:

- Cabeçalho: **"Complemento do orçamento"**
- Seção **"Já aprovados"** (somente leitura)
- Seção **"Novos itens — aguardando sua aprovação"** (com checkboxes)
- Total exibido: só novos itens selecionados
- Botões: **Aprovar novos itens** / **Recusar novos itens**

### Helpers (`apps/portal/src/lib/quote-lines.ts`)

```typescript
pendingQuoteLines()   // approved === null
approvedQuoteLines()  // approved === true
isSupplementQuote()   // ambos existem
buildApprovePayload() // envia só pendentes
```

### API portal — campos extras

```typescript
isSupplement?: boolean
pendingLineCount?: number
canRespond?: boolean  // PENDING && pendingLineCount > 0
```

### Comportamento antes de lançar itens novos

- Só reabrir: orçamento pode ficar `PENDING`, mas `canRespond=false` até existir linha `approved=null`
- Cliente **não** recebe push até oficina enviar link
- Timeline da OS: nota *"Complemento de orçamento solicitado"*

### Melhoria futura sugerida

Ocultar card de aprovação no portal até haver pelo menos 1 item novo.

---

## 12. Notificações push

| Evento | Quando | Push |
|--------|--------|------|
| `quote.sent` | Primeiro envio do orçamento | "Novo orçamento" |
| `quote.supplement` | Envio do link do complemento | "Itens adicionais no orçamento" |

Push URL típica: `/orcamento/{token}` ou rota interna do portal.

---

## 13. Modelo de dados (conceitual)

### Quote

```
id, number, status (DRAFT|PENDING|APPROVED|REJECTED), amount, serviceOrderId
```

### QuoteLine

```
id, quoteId, serviceOrderItemId, description, quantity, unitPrice, discount,
approved: boolean | null,
sortOrder, lineType (SERVICE|PART|THIRD_PARTY)
```

### Supplier / Purchase / Financial

- `suppliers` ↔ `purchase_orders` ↔ `purchase_order_items`
- `financial_entries` com `supplierId`, `purchaseOrderId`, `origin`
- `service_order_items.unitCost` para lucro

---

## 14. Bugs corrigidos e lições

| Problema | Causa | Solução |
|----------|-------|---------|
| Botão "Aumentar orçamento" não fazia nada | `onSuccess` aguardava `refetch` antes de abrir drawer | Abrir UI primeiro; refetch em background; `onMutate` otimista |
| Orçamento errado no botão | `getActiveQuote()` ≠ `APPROVED` | `getApprovedQuote()` separado |
| POST silencioso | Backend exige body JSON | `body: "{}"` no client |
| Portal servia ERP | Root Directory errado na Vercel | `apps/portal` no projeto portal |
| Links WhatsApp quebrados | URL hardcoded legada | `portalBaseUrl()` + `VITE_PORTAL_URL` |
| Reabertura silenciosa no backend | Sync retornava sem atualizar | Validar status final `PENDING`; marcar linhas antigas `approved=true` |
| Build Vercel TS | `useApiQuery` 3º arg boolean | Não usar `{ enabled: boolean }` |
| Prisma EPERM Windows | Engine locked | Fechar processos Node antes de build |

---

## 15. Checklist de deploy

### Variáveis

| App | Variável | Exemplo |
|-----|----------|---------|
| ERP | `VITE_API_URL` | API em produção ou vazio com proxy |
| ERP | `VITE_PORTAL_URL` | `https://oficina-beto-portal.vercel.app` |
| Portal | `VITE_API_URL` | mesma API |
| API | `DATABASE_URL` | Postgres (pooler 6543) |
| API | `DIRECT_URL` | Postgres direct (migrations) |
| API | `CORS_ORIGIN` | domínios ERP + Portal |

### Pós-deploy

- [ ] Migration `20260616160000_suppliers_purchases_finance` aplicada
- [ ] `POST /quotes/:id/reopen-supplement` responde 200
- [ ] Link WhatsApp abre portal (não ERP)
- [ ] Complemento visível após adicionar itens + enviar link
- [ ] Permissões `suppliers.manage` / `purchases.manage` (re-login admin)
- [ ] Três `.env` (raiz, `packages/database`, `apps/api`) com mesmo Supabase

---

## 16. Pendências e melhorias futuras

- Ocultar card de aprovação no portal até existir item novo
- Replicar ações de complemento em `QuoteDetailPage` (tela standalone de orçamento)
- Notificação automática ao reabrir (hoje só no share-link)
- Sugestão de produtos parecidos na compra (evitar duplicata por nome diferente)
- Testes E2E: rolamento → aumentar → pastilha → aprovar no portal
- Rate limit login, reset de senha (segurança SaaS)

---

## 17. Prompt único para outro projeto

> Implemente um ERP de oficina mecânica com monorepo: API NestJS + Prisma, dashboard React (equipe) e portal React separado (cliente). Uma instância por oficina (Supabase + 3 deploys Vercel: API, ERP, Portal).
>
> **Fornecedores e compras:** CRUD fornecedores; wizard de compra com confirmação que gera contas a pagar e opcionalmente lança estoque (criar produto automaticamente); recebimento parcial; cancelamento com estorno.
>
> **Financeiro:** parcelas de compra, baixa com juros/multa/taxa cartão, exclusão com motivo obrigatório e auditoria, filtros por origem e fornecedor.
>
> **OS:** histórico finalizadas/entregues, impressão com `?print=1`, snapshot `unitCost` nas peças para lucro real nos relatórios.
>
> **Complemento de orçamento:** após aprovação e OS em andamento, reabrir o mesmo orçamento (`POST /quotes/:id/reopen-supplement`), sincronizar linhas preservando `approved`, adicionar itens na OS, enviar link ao cliente. Portal separa "Já aprovados" vs "Novos itens". Aprovação/recusa parcial por linha. Push diferenciado para complemento.
>
> **Deploy:** Root Directory correto por app na Vercel; `VITE_PORTAL_URL` no ERP; funções centralizadas `portalBaseUrl()`, `portalAccessUrl()`, `portalPublicQuoteUrl()`; lista de URLs legadas.
>
> **UX crítica:** mutations que abrem modal/drawer devem dar feedback imediato — não bloquear UI em `await refetch()` no `onSuccess`.
>
> **Branding:** variáveis `VITE_APP_NAME`, logos em `public/`, módulo `branding.ts`, compatibilidade com URLs legadas.

---

## 18. Arquivos principais

### Banco e tipos

```
packages/database/prisma/schema.prisma
packages/database/prisma/migrations/20260616160000_suppliers_purchases_finance/
packages/database/src/system-permissions.ts
```

### API

```
apps/api/src/suppliers/
apps/api/src/purchases/
apps/api/src/financial/
apps/api/src/quotes/quotes-sync.service.ts
apps/api/src/quotes/quotes.service.ts
apps/api/src/quotes/quotes.controller.ts
apps/api/src/portal/portal.service.ts
apps/api/src/search/
apps/api/src/service-orders/service-orders.service.ts
apps/api/src/products/stock-movement.service.ts
apps/api/src/reports/reports.service.ts
apps/api/src/push/push.service.ts
apps/api/src/auth/auth.service.ts
```

### ERP (`app/`)

```
app/src/pages/suppliers/
app/src/pages/purchases/PurchasesPage.tsx
app/src/pages/financial/FinancialPage.tsx
app/src/pages/service-orders/ServiceOrdersPage.tsx
app/src/pages/service-orders/ServiceOrderDetailPage.tsx
app/src/pages/DashboardPage.tsx
app/src/components/GlobalSearchDialog.tsx
app/src/components/financial/DeleteEntryModal.tsx
app/src/components/financial/PayEntryModal.tsx
app/src/lib/routes.ts
app/src/lib/branding.ts
app/src/lib/api.ts
app/src/lib/financialPeriod.ts
app/src/lib/reportFinancialKpis.ts
app/src/lib/timeGreeting.ts
```

### Portal (`apps/portal/`)

```
apps/portal/src/components/portal/QuoteDetailContent.tsx
apps/portal/src/components/portal/QuoteActionCard.tsx
apps/portal/src/lib/quote-lines.ts
apps/portal/src/lib/branding.ts
apps/portal/src/pages/PortalServiceOrderPage.tsx
apps/portal/src/pages/PortalHomePage.tsx
```

### Documentação relacionada

```
docs/changelog/2026-06-16-mudancas.md      ← changelog resumido da mesma data
docs/fluxos/compras.md
docs/PORTAL-DO-CLIENTE-VERCEL.md
docs/DEPLOY-VERCEL.md
NOVA-INSTANCIA-OFICINA.md
```

---

*Este documento consolida o changelog de 16/06/2026, o deploy/rebranding do portal e a feature de complemento de orçamento. Use como especificação para replicar em outra oficina ou outro repositório.*
