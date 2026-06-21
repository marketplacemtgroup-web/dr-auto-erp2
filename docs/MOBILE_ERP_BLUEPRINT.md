# MOBILE ERP BLUEPRINT — `dashboard-app`

Documento gerado em **18/06/2026** a partir da análise do monorepo real (`oficina-beto`).  
**Escopo:** plano para um app mobile **completo do ERP** (React Native + Expo + TypeScript) na pasta `dashboard-app`, consumindo **somente** a API NestJS existente.

> **Não implementar ainda.** Este arquivo é análise + plano.

---

## 1. Resumo do ERP atual

### 1.1 Arquitetura

```
┌─────────────────┐   ┌─────────────────┐   ┌──────────────────────┐
│  app/ (ERP web) │   │ apps/portal/    │   │ APLICATIVO OFICINA/  │
│  Vite + React   │   │ Portal cliente  │   │ Kotlin + Compose     │
│  porta 3000     │   │ porta 3001      │   │ (operacional chão)   │
└────────┬────────┘   └────────┬────────┘   └──────────┬───────────┘
         │                     │                        │
         └─────────────────────┼────────────────────────┘
                               ▼
                    ┌──────────────────────┐
                    │  apps/api/ (NestJS)  │
                    │  prefixo /api        │
                    └──────────┬───────────┘
                               ▼
                    ┌──────────────────────┐
                    │ packages/database/   │
                    │ Prisma + PostgreSQL  │
                    │ (Supabase prod)      │
                    └──────────────────────┘
```

| Camada | Pasta | Stack |
|--------|-------|-------|
| ERP web | `app/` | React 19, Vite, React Router, TanStack Query, Zustand, Tailwind |
| Portal | `apps/portal/` | React, Vite, PWA |
| API | `apps/api/` | NestJS, Prisma, Passport JWT, bcrypt |
| Banco | `packages/database/` | Prisma 6, PostgreSQL 16 |
| Tipos | `packages/types/` | TypeScript compartilhado |
| App Android legado | `APLICATIVO OFICINA/` | Kotlin, Jetpack Compose, Retrofit |

**Deploy típico:** 3 projetos Vercel (API, ERP, Portal) + 1 Supabase por oficina.  
**Modo operacional:** `SINGLE_TENANT=true` — uma oficina por instância; cadastro em `/cadastro` só na primeira vez.

### 1.2 O que o ERP web faz hoje

Sistema **completo para oficina mecânica**: clientes, veículos, OS com workflow de 12 status, orçamentos (incl. complemento), estoque, catálogo de serviços, agenda de agendamentos, compras/fornecedores, financeiro (contas + caixa), equipe/comissões/folha interna, relatórios BI, configurações da oficina, admin básico.

**Não existe no projeto:**
- Ponto / controle de jornada (`ponto`) — sem model, API ou tela
- Escalas de funcionários (turnos/rotação) — só **agenda de clientes** (`Appointment`)
- NF-e, WhatsApp, CRM — desabilitados / fora do menu
- Edição avançada de roles — tela read-only (“em breve”)
- CRUD de filiais — só leitura + endereço via Configurações

### 1.3 App mobile existente vs `dashboard-app`

| | `APLICATIVO OFICINA/` | `dashboard-app` (planejado) |
|--|----------------------|----------------------------|
| Stack | Kotlin nativo | React Native + Expo + TS |
| Público | Mecânico/recepção no chão | **ERP completo** (gestão) |
| Cobertura API | ~20 endpoints (OS, checklist, fotos, orçamento básico) | Paridade com ERP web |
| Financeiro, compras, equipe, relatórios | **Não** | **Sim** (conforme permissões) |

O `dashboard-app` **não substitui** automaticamente o app Kotlin; convive ou substitui conforme decisão futura.

---

## 2. Lista de módulos encontrados

| # | Módulo | API | ERP web | Prisma | Observação |
|---|--------|-----|---------|--------|------------|
| 1 | Autenticação | ✅ | ✅ | ✅ | JWT 7d, login, cadastro inicial |
| 2 | Dashboard / KPIs | ✅ | ✅ | ✅ | Operacional + financeiro |
| 3 | Clientes | ✅ | ✅ | ✅ | PF/PJ, contatos, soft delete |
| 4 | Veículos | ✅ | ✅ | ✅ | Placa única por org |
| 5 | Ordem de Serviço | ✅ | ✅ | ✅ | 12 status, 7 abas no detalhe |
| 6 | Orçamentos | ✅ | ✅ | ✅ | Complemento, share link, aprovação |
| 7 | Catálogo de serviços | ✅ | ✅ | ✅ | |
| 8 | Estoque / produtos | ✅ | ✅ | ✅ | Movimentações, estoque mínimo |
| 9 | Agenda (clientes) | ✅ | ✅ | ✅ | Converter → OS |
| 10 | Fornecedores | ✅ | ✅ | ✅ | Perfil + histórico compras |
| 11 | Compras | ✅ | ✅ | ✅ | Wizard 5 passos, recebimento |
| 12 | Financeiro | ✅ | ✅ | ✅ | AP/AR, parcelas, caixa |
| 13 | Equipe / funcionários | ✅ | ✅ | ✅ | Acesso sistema, payment config |
| 14 | Cargos | ✅ | ✅ | ✅ | Job titles |
| 15 | Permissões (roles) | ✅ parcial | ✅ read-only | ✅ | Sem CRUD de role na API |
| 16 | Regras de comissão | ✅ | ✅ | ✅ | |
| 17 | Comissões geradas | ✅ | ⚠️ sem tela dedicada | ✅ | API `GET /team/commissions` |
| 18 | Lançamentos RH | ✅ | ✅ | ✅ | Vales, bônus, descontos |
| 19 | Fechamentos / folha | ✅ | ✅ | ✅ | Folha interna, não oficial |
| 20 | Produtividade | ✅ | ✅ | ✅ | |
| 21 | Relatórios / BI | ✅ | ✅ | ✅ | Export CSV |
| 22 | Configurações org | ✅ | ✅ | ✅ | Logo → Supabase Storage |
| 23 | Admin | ✅ | ✅ limitado | ✅ | Stats + log acesso |
| 24 | Auditoria | ✅ | ✅ | ✅ | |
| 25 | Busca global | ✅ | ✅ | ✅ | |
| 26 | Notificações escritório | ✅ | parcial | ✅ | Polling no web |
| 27 | Anexos / mídia OS | ✅ | ✅ | ✅ | Local ou Supabase Storage |
| 28 | Impressão | ✅ server HTML | ✅ client-side | — | Duas abordagens |
| 29 | Portal cliente | ✅ | — | ✅ | App separado (`apps/portal`) |
| 30 | **Escalas (funcionários)** | ❌ | ❌ | ❌ | **Não existe** |
| 31 | **Ponto / time clock** | ❌ | ❌ | ❌ | **Não existe** |

---

## 3. Lista de telas web encontradas

### Públicas
| Rota | Componente |
|------|------------|
| `/login` | `LoginPage` |
| `/cadastro` | `RegisterOrganizationPage` |

### Dashboard principal (`/dashboard/*`)
| Rota | Componente | Módulo |
|------|------------|--------|
| `/dashboard` | `DashboardPage` | Dashboard |
| `/dashboard/admin` | `AdminDashboardPage` | Admin |
| `/dashboard/clientes` | `CustomersPage` | Clientes |
| `/dashboard/clientes/:id` | `CustomerDetailPage` | Clientes |
| `/dashboard/veiculos` | `VehiclesPage` | Veículos |
| `/dashboard/veiculos/:id` | `VehicleDetailPage` | Veículos |
| `/dashboard/ordem-de-servico` | `ServiceOrdersPage` | OS |
| `/dashboard/ordem-de-servico/:id` | `ServiceOrderDetailPage` | OS (7 abas) |
| `/dashboard/orcamentos` | `QuotesPage` | Orçamentos |
| `/dashboard/orcamentos/:id` | `QuoteDetailPage` | Orçamentos |
| `/dashboard/servicos` | `ServicesPage` | Catálogo |
| `/dashboard/agenda` | `AgendaPage` | Agenda |
| `/dashboard/estoque` | `InventoryPage` | Estoque |
| `/dashboard/compras` | `PurchasesPage` | Compras |
| `/dashboard/fornecedores` | `SuppliersPage` | Fornecedores |
| `/dashboard/fornecedores/:id` | `SupplierDetailPage` | Fornecedores |
| `/dashboard/financeiro` | `FinancialPage` | Financeiro |
| `/dashboard/relatorios` | `ReportsPage` | Relatórios |
| `/dashboard/configuracoes` | `SettingsPage` | Configurações |

### Equipe (`TeamLayout`)
| Rota | Componente |
|------|------------|
| `/dashboard/equipe/funcionarios` | `EmployeesPage` |
| `/dashboard/equipe/funcionarios/:id` | `EmployeeDetailPage` |
| `/dashboard/equipe/cargos` | `JobTitlesPage` |
| `/dashboard/equipe/permissoes` | `PermissionsPage` (read-only) |
| `/dashboard/equipe/regras-comissao` | `CommissionRulesPage` |
| `/dashboard/equipe/lancamentos` | `TeamEntriesPage` |
| `/dashboard/equipe/fechamentos` | `PayrollPage` |
| `/dashboard/equipe/produtividade` | `ProductivityPage` |

### Definido mas não implementado
| Rota | Status |
|------|--------|
| `/dashboard/equipe/relatorios` | Constante em `routes.ts`, sem rota/página |

### Detalhe OS — abas (referência para mobile)
`Dados` · `Equipe` · `Orçamento` · `Itens` · `Checklist` · `Mídia` · `Timeline`

---

## 4. Lista de endpoints existentes

Base: **`/api`**. Auth staff: header `Authorization: Bearer <JWT>`.

### Auth
| Método | Path | Auth |
|--------|------|------|
| GET | `/auth/setup-status` | Público |
| GET | `/auth/branding` | Público |
| POST | `/auth/login` | Público |
| POST | `/auth/register-organization` | Público (1ª oficina) |
| GET | `/auth/me` | JWT |

### Organização
| Método | Path | Permissão |
|--------|------|-----------|
| GET | `/organizations/current` | JWT |
| GET | `/organizations/branches` | JWT |
| PATCH | `/organizations/current` | `settings.manage` |
| POST | `/organizations/current/logo` | `settings.manage` |
| GET | `/organizations/admin/stats` | `admin.access` |

### Usuários / Roles
| Método | Path | Permissão |
|--------|------|-----------|
| GET | `/users/members` | `users.manage` ou `service_orders.manage` |
| GET | `/roles` | `users.manage` |
| GET | `/roles/permissions` | `users.manage` |

### Dashboard
| Método | Path | Permissão |
|--------|------|-----------|
| GET | `/dashboard/kpis` | `dashboard.view` |
| GET | `/dashboard/kpis/financial` | `dashboard.view_financial` |
| GET | `/dashboard/service-orders-in-progress` | `dashboard.view` |
| GET | `/dashboard/pending-quotes` | `dashboard.view` |
| GET | `/dashboard/revenue-series` | `dashboard.view_financial` |

### Clientes
| Método | Path |
|--------|------|
| POST/GET/PATCH/DELETE | `/customers`, `/customers/:id` |
| POST/PATCH/DELETE | `/customers/:id/contacts`, `.../contacts/:contactId` |

### Veículos
| Método | Path |
|--------|------|
| POST/GET/PATCH/DELETE | `/vehicles`, `/vehicles/:id` |

### Ordem de serviço
| Método | Path |
|--------|------|
| POST/GET/PATCH/DELETE | `/service-orders`, `/service-orders/:id` |
| PATCH | `/service-orders/:id/checklist` |
| POST/PATCH/DELETE | `/service-orders/:id/items`, `.../items/:itemId` |
| POST | `/service-orders/:id/portal-link` |

### Orçamentos
| Método | Path |
|--------|------|
| POST/GET/PATCH/DELETE | `/quotes`, `/quotes/:id` |
| PATCH | `/quotes/:id/approve`, `/quotes/:id/reject` |
| POST | `/quotes/:id/reopen-supplement`, `/quotes/:id/share-link` |

### Produtos / estoque
| Método | Path |
|--------|------|
| POST/GET/PATCH/DELETE | `/products`, `/products/:id` |
| PATCH | `/products/:id/stock` |
| GET | `/products/movements` |

### Catálogo de serviços
| Método | Path |
|--------|------|
| POST/GET/PATCH/DELETE | `/service-catalog`, `/service-catalog/:id` |

### Agenda
| Método | Path |
|--------|------|
| POST/GET/PATCH/DELETE | `/appointments`, `/appointments/:id` |
| POST | `/appointments/:id/convert-to-os` |

### Compras
| Método | Path |
|--------|------|
| GET/POST/PATCH | `/purchases`, `/purchases/:id` |
| PATCH | `/purchases/:id/confirm`, `.../receive`, `.../cancel` |

### Fornecedores
| Método | Path |
|--------|------|
| GET/POST/PATCH/DELETE | `/suppliers`, `/suppliers/:id` |
| GET | `/suppliers/:id/profile` |

### Financeiro
| Método | Path |
|--------|------|
| GET/POST/DELETE | `/financial`, `/financial/:id` |
| PATCH | `/financial/:id/pay` |
| POST | `/financial/installments`, `/financial/from-service-order/:serviceOrderId` |
| GET | `/financial/cash-flow`, `/financial/profit-summary`, `/financial/receive-queue` |

### Caixa
| Método | Path |
|--------|------|
| GET | `/cash/current` |
| POST | `/cash/open`, `/cash/:sessionId/close`, `/cash/:sessionId/movement` |

### Equipe (24 rotas em `/team`)
| Grupo | Exemplos |
|-------|----------|
| Funcionários | `GET/POST/PATCH /team/employees`, `/employees/:id` |
| Técnicos | `GET /team/employees/technicians` |
| Acesso | `POST/PATCH /team/employees/:id/access`, `.../access/reset-password` |
| Cargos | `GET/POST/PATCH /team/job-titles` |
| Comissões | `GET/POST/PATCH /team/commission-rules`, `GET /team/commissions` |
| Lançamentos | `GET/POST/PATCH /team/entries`, `PATCH .../cancel` |
| Folha | `GET/POST /team/payroll`, `GET preview`, `PATCH close/paid` |
| Outros | `GET /team/stats`, `/team/productivity`, `/team/login-email-domain` |

### Relatórios
| Método | Path |
|--------|------|
| GET | `/reports/full`, `/reports/summary`, `/reports/bi` |
| GET | `/reports/export/:type` |

### Anexos
| Método | Path |
|--------|------|
| GET | `/attachments/storage-info`, `/attachments/service-order/:id`, `/attachments/:id/file` |
| POST | prepare/confirm upload, multipart upload |
| DELETE | `/attachments/:id` |

### Outros
| Método | Path |
|--------|------|
| GET | `/search?q=` |
| GET/PATCH/POST | `/notifications/unread`, `/:id/read`, `/read-all` |
| GET | `/audit-logs` |
| GET | `/print/service-orders/:id`, `/print/quotes/:id` |

> **Portal** (`/api/portal/*`) é para **cliente final**, não para o `dashboard-app`.

---

## 5. Endpoints que faltam para o app mobile

A API cobre **a maior parte** do ERP. Gaps reais para experiência mobile completa:

| Gap | Impacto mobile | Prioridade | Nota |
|-----|----------------|------------|------|
| **Refresh token / sessão longa** | Re-login frequente (JWT 7d fixo) | Alta | Sugestão: refresh token ou “lembrar dispositivo” |
| **Push notifications (staff)** | Só portal tem FCM; escritório usa polling | Alta | Sugestão: estender `PushService` para staff |
| **Password reset (staff)** | Só admin reseta via equipe | Média | `POST /team/employees/:id/access/reset-password` |
| **Paginação padronizada** | Listas grandes lentas no mobile | Alta | Hoje muitos GET retornam lista completa |
| **PATCH job-titles** | Existe na API, não no client web | Baixa | Já existe backend |
| **Org switch / multi-org login** | N/A se single-tenant | Baixa | Schema multi-tenant, deploy single |
| **Branch CRUD** | Só matriz editável | Baixa | |
| **Role CRUD** | Permissões read-only | Média | Confirmar se mobile precisa editar |
| **Escalas / ponto** | Módulos inexistentes | — | **Requer backend novo** se for escopo |
| **Offline sync** | App Kotlin não tem; mobile ERP precisaria | Alta | **Sugestão:** fila local + retry (não existe API) |
| **Deep link universal** | Abrir OS/quote por link | Média | Sugestão |
| **Biometria** | UX local | — | Só no app, SecureStore |
| **Upload chunked / progress** | Fotos grandes na OS | Média | Multipart existe; prepare/confirm para Supabase |

**Não inventar endpoints** para ponto/escalas até product confirmar e backend existir.

---

## 6. Estrutura sugerida do `dashboard-app`

```
dashboard-app/
├── app.json                    # Expo config
├── app/                        # Expo Router (file-based)
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── _layout.tsx
│   ├── (app)/
│   │   ├── _layout.tsx         # Tabs + drawer
│   │   ├── index.tsx           # Dashboard
│   │   ├── customers/
│   │   ├── vehicles/
│   │   ├── service-orders/
│   │   ├── quotes/
│   │   ├── inventory/
│   │   ├── purchases/
│   │   ├── suppliers/
│   │   ├── financial/
│   │   ├── team/
│   │   ├── reports/
│   │   └── settings/
│   └── _layout.tsx
├── src/
│   ├── api/
│   │   ├── client.ts           # fetch + JWT + ApiError
│   │   ├── auth.ts
│   │   ├── service-orders.ts
│   │   └── ...                 # 1 arquivo por domínio (espelha app/lib/api.ts)
│   ├── stores/
│   │   ├── authStore.ts        # Zustand + SecureStore
│   │   └── brandingStore.ts
│   ├── hooks/
│   ├── components/
│   │   ├── ui/                 # Button, Card, Input, Sheet
│   │   └── modules/            # OsStatusBadge, QuoteLineList...
│   ├── lib/
│   │   ├── permissions.ts      # Copiar lógica de app/src/lib/permissions.ts
│   │   ├── format.ts
│   │   └── constants.ts
│   └── types/
│       └── index.ts            # Importar de @autocore/types quando possível
├── assets/
├── .env.example                # EXPO_PUBLIC_API_URL=https://...api
├── package.json
└── tsconfig.json
```

**Dependências sugeridas:** Expo SDK 52+, Expo Router, TanStack Query, Zustand, expo-secure-store, expo-image-picker, expo-camera, react-native-recharts (ou victory-native para BI simplificado).

**Monorepo:** adicionar `"dashboard-app"` em `workspaces` na raiz **quando implementar**.

---

## 7. Navegação sugerida

### Auth stack
```
Login → (JWT ok) → App principal
```

### App principal — **Bottom tabs** (5) + **menu lateral** para módulos secundários

| Tab | Destino | Permissão |
|-----|---------|-----------|
| Início | Dashboard KPIs + OS em andamento | `dashboard.view` |
| OS | Lista + busca | `service_orders.manage` |
| Clientes | Lista clientes/veículos rápido | `customers.manage` |
| Mais | Drawer com módulos restantes | variável |
| Perfil | Sessão, notificações, sair | JWT |

### Drawer “Mais” (filtrado por permissão)
- Orçamentos
- Agenda
- Estoque
- Compras
- Fornecedores
- Financeiro
- Equipe
- Relatórios
- Configurações
- Admin

### Stacks aninhadas (exemplo OS)
```
OS List → OS Detail (tabs: Dados | Itens | Checklist | Orçamento | Mídia | Timeline)
        → Add Item
        → Camera / Gallery upload
        → Quote actions (share, approve)
```

**Princípio:** mesma hierarquia mental do ERP web, adaptada para telas estreitas (menos abas simultâneas, mais stacks).

---

## 8. Telas necessárias no app

Legenda: ✅ API pronta · ⚠️ parcial · ❌ não existe no backend

### Fase mínima (paridade operacional — similar ao app Kotlin + gestão básica)
| Tela | API | Prioridade |
|------|-----|------------|
| Login | ✅ | P0 |
| Dashboard (KPIs + OS andamento + orçamentos pendentes) | ✅ | P0 |
| Lista OS + filtros status | ✅ | P0 |
| Detalhe OS (dados, status, itens, checklist, mídia) | ✅ | P0 |
| Criar OS | ✅ | P0 |
| Lista orçamentos + detalhe + share link | ✅ | P0 |
| Complemento orçamento (reopen + aprovar pendentes) | ✅ | P1 |
| Busca global | ✅ | P1 |
| Notificações escritório | ✅ | P1 |
| Clientes lista + detalhe + criar | ✅ | P1 |
| Veículos lista + detalhe + criar | ✅ | P1 |
| Catálogo serviços / produtos (picker na OS) | ✅ | P1 |

### Fase gestão completa
| Tela | API | Prioridade |
|------|-----|------------|
| Estoque lista + ajuste + movimentações | ✅ | P2 |
| Agenda semanal + criar + converter OS | ✅ | P2 |
| Fornecedores lista + detalhe | ✅ | P2 |
| Compras lista + wizard simplificado (mobile) | ✅ | P2 |
| Financeiro lançamentos + baixa | ✅ | P2 |
| Caixa abrir/fechar/movimento | ✅ | P2 |
| Fila receber OS | ✅ | P2 |
| Equipe funcionários + detalhe + acesso | ✅ | P3 |
| Cargos, regras comissão, lançamentos, folha | ✅ | P3 |
| Produtividade | ✅ | P3 |
| Comissões geradas (lista) | ✅ | P3 |
| Relatórios BI (versão resumida) | ✅ | P3 |
| Configurações org + logo | ✅ | P3 |
| Admin stats | ✅ | P3 |
| Permissões (read-only) | ✅ | P3 |

### Fora de escopo até existir backend
| Tela | Status |
|------|--------|
| Ponto / batida | ❌ **Sugestão futura** |
| Escalas de equipe | ❌ **Sugestão futura** |
| Editar roles | ❌ API read-only |
| NF-e / WhatsApp / CRM | ❌ desabilitado no ERP |

---

## 9. Permissões por perfil no app

Permissões vêm do JWT (`/auth/me` → `permissions[]`). Guard: **`admin.access` passa tudo** (igual API).

### Slugs do sistema (19)
`dashboard.view`, `dashboard.view_financial`, `financial.view`, `financial.manage`, `customers.manage`, `vehicles.manage`, `service_orders.manage`, `quotes.manage`, `inventory.manage`, `suppliers.manage`, `purchases.manage`, `users.manage`, `settings.manage`, `admin.access`, `team.manage`, `team.view_salaries`, `commissions.manage`, `commissions.view`, `payroll.manage`

### Perfis padrão → o que vê no app

| Perfil | Slug | Módulos mobile típicos |
|--------|------|------------------------|
| Administrador | `admin` | Tudo |
| Gerente | `gerente` | Tudo exceto Admin panel |
| Recepção | `recepcao` | Dashboard, clientes, veículos, OS, orçamentos, agenda |
| Mecânico | `mecanico` | Dashboard, OS, orçamentos, estoque (leitura/uso) |
| Estoque | `estoque` | Dashboard, estoque, fornecedores*, compras* |
| Financeiro | `financeiro` | Dashboard financeiro, financeiro, equipe (salários), relatórios |
| Vendedor | `vendedor` | Clientes, orçamentos |
| Consulta | `consulta` | Dashboard read-only |

\* Fornecedores/compras: perfil `estoque` não tem slug `suppliers.manage`/`purchases.manage` no default — menu condicional igual ERP web.

### Implementação no app
```typescript
// Espelhar app/src/lib/permissions.ts + hasPermission()
// Esconder tab/drawer item se !hasPermission(user, required)
// Bloquear rota deep link com tela "Sem permissão"
```

---

## 10. Regras de segurança

| Regra | Detalhe |
|-------|---------|
| **Só API** | `EXPO_PUBLIC_API_URL` → `https://xxx-api.vercel.app/api`. **Proibido** Supabase client no app |
| **JWT em SecureStore** | Nunca AsyncStorage plain para token |
| **HTTPS obrigatório** | Produção; cleartext só dev |
| **Org scope** | Token carrega `organizationId`; não enviar org id arbitrário |
| **Permissões client-side** | UX only; API valida com `PermissionsGuard` |
| **Uploads** | Multipart ou prepare/confirm; URLs de arquivo via `/attachments/:id/file` |
| **Logout** | Limpar SecureStore + cache Query |
| **Sessão expirada** | 401 → redirect login |
| **Biometria** | Opcional: desbloquear app localmente, não substitui JWT |
| **Logs** | Não logar token/senha em produção |
| **Cadastro org** | Ocultar no app se `setup-status.hasOrganization === true` |

---

## 11. Fluxos principais mobile

### 11.1 OS — recepção → execução
```
Login → Dashboard → Nova OS (veículo + relato)
  → Detalhe OS → Adicionar itens (serviço/peça)
  → Orçamento sincronizado (PENDING)
  → Share link portal → Cliente aprova
  → Status IN_PROGRESS → Checklist + fotos
  → Status FINISHED → Financeiro (fila receber)
```

### 11.2 Complemento de orçamento (existente no ERP)
```
OS IN_PROGRESS + orçamento APPROVED
  → Adicionar item novo → reopen-supplement automático
  → Linhas antigas approved=true, novas pending
  → Share link → Cliente aprova pendentes
  → Quote APPROVED, OS continua IN_PROGRESS
```
Ver: `docs/fluxos/FLUXO-COMPLEMENTO-ORCAMENTO.md`

### 11.3 Compras → estoque → financeiro
```
Nova compra (fornecedor + itens)
  → Confirmar → gera contas a pagar
  → Receber → movimenta estoque
  → Pagar em Financeiro / Caixa
```

### 11.4 Equipe / comissão / folha
```
Funcionário com regra comissão
  → OS finalizada / pagamento recebido (trigger)
  → GeneratedCommission PENDENTE
  → Fechamento folha → PAGA
```
**Não inclui ponto.**

### 11.5 Agenda
```
Agendamento (veículo + data + mecânico)
  → Confirmado → Converter em OS
```

---

## 12. Plano de implementação em fases

### Fase 0 — Fundação (1–2 semanas)
- [ ] Criar `dashboard-app` Expo + TS + Expo Router
- [ ] Client HTTP (JWT, ApiError, timeout)
- [ ] Auth: login, `/me`, SecureStore, guard rotas
- [ ] Branding bootstrap (`/auth/branding`)
- [ ] Permissões + layout tabs/drawer
- [ ] CI: lint + typecheck

### Fase 1 — Operacional P0 (2–3 semanas)
- [ ] Dashboard
- [ ] OS lista + detalhe + CRUD itens + checklist + status
- [ ] Anexos (câmera + upload)
- [ ] Orçamentos lista + detalhe + share + approve/reject
- [ ] Busca global
- [ ] Clientes + veículos (CRUD básico)

### Fase 2 — Operacional P1 (2 semanas)
- [ ] Complemento orçamento
- [ ] Notificações
- [ ] Portal link na OS
- [ ] Catálogo serviços + picker produtos

### Fase 3 — Gestão P2 (3–4 semanas)
- [ ] Estoque + movimentações
- [ ] Agenda
- [ ] Fornecedores + compras (wizard mobile)
- [ ] Financeiro + caixa + fila receber

### Fase 4 — Equipe & BI P3 (3 semanas)
- [ ] Módulo equipe completo
- [ ] Relatórios (BI resumido + export share)
- [ ] Configurações + admin

### Fase 5 — Polish
- [ ] Push staff (se API pronta)
- [ ] Offline queue (sugestão)
- [ ] Testes E2E Detox
- [ ] Build EAS Android + iOS
- [ ] Documentação operacional

**Estimativa total:** 11–14 semanas (1 dev full-time), dependendo de escopo BI e compras mobile.

---

## 13. Riscos técnicos

| Risco | Severidade | Mitigação |
|-------|------------|-----------|
| **Paridade 100% com web** | Alta | Priorizar fluxos; BI simplificado no mobile |
| **Listas sem paginação** | Alta | Paginar client-side inicial; pedir paginação na API |
| **JWT 7d sem refresh** | Média | Re-login; planejar refresh token |
| **Upload fotos instável** | Média | Retry + prepare/confirm Supabase |
| **Relatórios BI pesados** | Alta | Não replicar todos gráficos; usar `/reports/summary` |
| **Compras wizard 5 passos** | Média | Redesign mobile (não copiar wizard web literal) |
| **Dois apps Android** | Média | Definir: Kotlin chão vs Expo gestão |
| **Duplicação tipos** | Baixa | Reusar `@autocore/types` |
| **CORS / API URL por instância** | Média | `.env` por build (4 oficinas = 4 URLs) |
| **Impressão** | Baixa | Share PDF/HTML via `/print/*` ou WebView |

---

## 14. Pontos a confirmar antes de codar

### Produto
1. **`dashboard-app` substitui o app Kotlin** ou convive (mecânico Kotlin + gestão Expo)?
2. **iOS** é requisito day-one ou só Android?
3. **Offline** é obrigatório (checklist/fotos sem rede)?
4. **Ponto e escalas** entram no roadmap? (hoje **não existem** — exigiria backend novo)
5. **Relatórios mobile:** resumo ou paridade total com TV mode web?
6. **Compras no celular:** fluxo completo ou só consulta + recebimento?

### Técnico
7. **URL da API** por instância — variável `EXPO_PUBLIC_API_URL` no EAS?
8. **Paginação na API** — implementar antes do mobile ou aceitar limite?
9. **Push para staff** — escopo API + Firebase compartilhado com portal?
10. **Monorepo workspace** — `dashboard-app` entra no npm workspaces?
11. **Reuso de `@autocore/types`** — tipos OpenAPI ou manual?
12. **Single-tenant** permanece? (sem seletor de oficina no login)

### Design
13. Identidade visual: seguir ERP web (cores org dinâmicas) ou tema fixo?
14. Tab bar fixa 5 itens — quais para perfil **mecânico** vs **gerente**?

### Legal / operação
15. Folha/comissões no mobile — mesma disclaimer “folha interna não oficial”?
16. Biometria / PIN local — requisito de segurança da oficina?

---

## Apêndice A — Schema Prisma (resumo)

- **51 models**, **38 enums**
- Tenant root: `Organization` → quase tudo com `organizationId`
- OS: 12 status (`ServiceOrderStatus`)
- Quote: DRAFT/PENDING/APPROVED/REJECTED + `QuoteLine.approved` (complemento)
- Team: `Employee`, `EmployeeCommissionRule`, `GeneratedCommission`, `Payroll`, `EmployeeEntry`
- **Sem** models de `TimeClock`, `WorkShift`, `Schedule`

## Apêndice B — Referências no repositório

| Assunto | Arquivo |
|---------|---------|
| Rotas web | `app/src/App.tsx`, `app/src/lib/routes.ts` |
| Permissões menu | `app/src/lib/permissions.ts` |
| API client web | `app/src/lib/api.ts` |
| API NestJS | `apps/api/src/**/*.controller.ts` |
| Schema | `packages/database/prisma/schema.prisma` |
| Permissões seed | `packages/database/src/system-permissions.ts` |
| Roles default | `apps/api/src/team/default-roles.ts` |
| App Kotlin endpoints | `APLICATIVO OFICINA/.../WorkshopApi.kt` |
| Fluxo complemento | `docs/fluxos/FLUXO-COMPLEMENTO-ORCAMENTO.md` |
| Nova instância | `NOVA-INSTANCIA-OFICINA.md` |

---

**Próximo passo sugerido:** responder os itens da seção 14 → iniciar Fase 0 em `dashboard-app/`.
