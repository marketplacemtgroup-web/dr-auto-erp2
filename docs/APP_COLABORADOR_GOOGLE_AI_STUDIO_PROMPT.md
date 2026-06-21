# PROMPT COMPLETO — App Colaborador (Google AI Studio / APK Android)

> **Como usar:** copie todo este arquivo e cole no Google AI Studio. Anexe também as imagens do logo/marca da oficina como referência visual obrigatória.
>
> **Contexto:** Este prompt une (1) a especificação do aplicativo do funcionário e (2) o backend **real** já implementado no ERP Oficina Beto (NestJS + PostgreSQL/Supabase). O app deve consumir **somente a API** — nunca o Supabase diretamente.

---

## INSTRUÇÃO PRINCIPAL — REFERÊNCIA VISUAL OBRIGATÓRIA

Antes de criar qualquer tela, analise **todas as imagens anexadas** (logo, cores, identidade da oficina).

Use as imagens para definir:

- logo oficial nas telas: login, início, OS, comissões, ponto, escala, perfil
- paleta extraída do logo (não inventar cores genéricas)
- estilo automotivo, premium, profissional, confiável

Prioridade:

1. Fidelidade visual à marca
2. Logo correto
3. Interface funcional e pronta para produção
4. Integração real com API (sem mock)

---

## 1. CONTEXTO DO PROJETO

Criar aplicativo Android **App Colaborador** — exclusivo para funcionários da oficina.

**Nome sugerido:** `{NOME_DA_OFICINA} Colaborador` (ex.: *Oficina do Beto Colaborador*)

**Este app NÃO é:**
- o app interno operacional (checklist, fotos OS, diagnóstico)
- o app/portal do cliente
- um PWA ou demo com dados falsos

**Este app É:**
- área pessoal do funcionário: OS dele, comissões dele, escala dele, ponto dele, solicitações dele, comunicados, desempenho, documentos, perfil

**Regras de negócio críticas:**
- Funcionário **só vê dados dele**
- **Não** mostrar: financeiro geral, lucro, margem, custo de peças, contas a pagar/receber, faturamento, salário/comissão de outros
- Login real via API + JWT Bearer
- 401 → deslogar | 403 → "Sem permissão" | sem internet → tela offline

**Arquitetura:**

```
App Colaborador (Expo/React Native)
        ↓ HTTPS + JWT
API NestJS (/api/*)
        ↓
PostgreSQL (Supabase)
        ↓
ERP Web (gestão)
```

---

## 2. STACK OBRIGATÓRIA

- React Native + **Expo**
- TypeScript
- React Navigation (Stack + Bottom Tabs)
- Axios
- SecureStore ou AsyncStorage (token)
- NetInfo (offline)
- Expo Notifications (preparado)
- Expo Location (opcional — ponto)
- Expo Image Picker (opcional — anexos em solicitações)
- Context API ou Zustand (sessão)

**Proibido:** mock, arrays fake, Supabase client no app, PWA.

Se um endpoint ainda não existir no backend, o service deve lançar erro claro — **não inventar dados**.

---

## 3. BACKEND REAL — O QUE JÁ EXISTE NO ERP

Monorepo: API em `apps/api`, banco em `packages/database`.

### 3.1 Autenticação (usar estas rotas — NÃO criar login separado)

| Ação | Método | Rota real |
|------|--------|-----------|
| Login | POST | `/api/auth/login` |
| Sessão atual | GET | `/api/auth/me` |
| Branding (logo/cores) | GET | `/api/auth/branding` |

**Login — body real:**

```json
{
  "email": "carlos@oficinadobeto.local",
  "password": "senha123"
}
```

> O ERP usa e-mail de login no formato `usuario@dominio-da-oficina`. O domínio é configurado no cadastro da organização (ex.: `oficinadobeto.local`). Não existe `POST /colaborador-app/login` — use `/auth/login`.

**Resposta real do login (`POST /api/auth/login`):**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "cuid_user",
    "email": "carlos@oficinadobeto.local",
    "name": "Carlos Silva",
    "avatarUrl": null
  },
  "organizationId": "cuid_org",
  "organizationName": "Oficina do Beto",
  "branchId": null,
  "role": "mecanico",
  "permissions": [
    "dashboard.view",
    "service_orders.manage",
    "ponto.ver",
    "ponto.bater",
    "escalas.ver",
    "solicitacoes.ver",
    "solicitacoes.criar"
  ]
}
```

**Header em todas as rotas privadas:**

```
Authorization: Bearer {accessToken}
Content-Type: application/json
```

**Base URL (configurável):**

```typescript
// src/config/api.ts
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://SUA-API.vercel.app/api";
```

### 3.2 Ponto, Escala e Solicitações — PRONTOS em `/api/colaborador-app`

Estes endpoints **já existem** e foram feitos para o app colaborador:

| Módulo | Método | Rota | Permissão mínima |
|--------|--------|------|------------------|
| Ponto do dia | GET | `/colaborador-app/ponto/hoje` | `ponto.ver` ou `ponto.bater` |
| Bater ponto | POST | `/colaborador-app/ponto/bater` | `ponto.bater` |
| Histórico ponto | GET | `/colaborador-app/ponto/historico?periodStart=&periodEnd=` | `ponto.ver` |
| Minha escala | GET | `/colaborador-app/escala?periodStart=&periodEnd=` | `escalas.ver` |
| Minhas solicitações | GET | `/colaborador-app/solicitacoes` | `solicitacoes.ver` |
| Nova solicitação | POST | `/colaborador-app/solicitacoes` | `solicitacoes.criar` |

**Aviso legal (obrigatório na tela de Ponto):**

> Controle interno de ponto. Para uso oficial, valide regras trabalhistas com a contabilidade da oficina.

---

## 4. CONTRATOS REAIS DA API — PONTO / ESCALA / SOLICITAÇÕES

### 4.1 Bater ponto — `POST /api/colaborador-app/ponto/bater`

**Body (camelCase — enums em MAIÚSCULAS):**

```json
{
  "entryType": "ENTRADA",
  "latitude": -23.5505,
  "longitude": -46.6333,
  "addressApprox": "Próximo à oficina",
  "device": "Android 14",
  "notes": "opcional"
}
```

**Valores de `entryType`:**

| Valor API | Significado | Botão no app |
|-----------|-------------|--------------|
| `ENTRADA` | Entrada | Registrar entrada |
| `INTERVALO_INICIO` | Início intervalo | Iniciar intervalo |
| `INTERVALO_FIM` | Fim intervalo | Voltar do intervalo |
| `SAIDA` | Saída | Registrar saída |

**Resposta:**

```json
{
  "entry": {
    "id": "...",
    "entryType": "ENTRADA",
    "recordedAt": "2026-06-21T10:58:00.000Z",
    "origin": "APP_COLABORADOR",
    "status": "VALIDO"
  },
  "day": {
    "id": "...",
    "workDate": "2026-06-21T00:00:00.000Z",
    "clockIn": "2026-06-21T10:58:00.000Z",
    "breakStart": null,
    "breakEnd": null,
    "clockOut": null,
    "workedMinutes": 0,
    "expectedMinutes": 540,
    "lateMinutes": 0,
    "overtimeMinutes": 0,
    "earlyLeaveMinutes": 0,
    "status": "PENDENTE",
    "schedule": { "startTime": "08:00", "endTime": "18:00", "dayType": "TRABALHO" }
  }
}
```

**Regras de negócio (backend já valida):**
- Não permite saída sem entrada
- Não permite intervalo fim sem intervalo início
- Não permite segunda entrada no mesmo dia
- Funcionário inativo não bate ponto
- Usuário deve estar vinculado a um `Employee` (cadastro em Equipe → Funcionários → Acesso)

**Erros comuns:**
- `403` — sem permissão `ponto.bater`
- `400` — sequência inválida ("Entrada já registrada hoje...")
- `403` — "Usuário não vinculado a um funcionário"

### 4.2 Ponto do dia — `GET /api/colaborador-app/ponto/hoje`

Retorna **array** com o resumo do dia do funcionário logado (0 ou 1 item):

```json
[
  {
    "id": "...",
    "workDate": "2026-06-21T00:00:00.000Z",
    "clockIn": "2026-06-21T10:58:00.000Z",
    "breakStart": null,
    "breakEnd": null,
    "clockOut": null,
    "workedMinutes": 125,
    "lateMinutes": 58,
    "overtimeMinutes": 0,
    "status": "PENDENTE",
    "employee": { "id": "...", "name": "Carlos", "jobTitle": { "name": "Mecânico" } },
    "schedule": {
      "startTime": "08:00",
      "endTime": "18:00",
      "breakStart": "12:00",
      "breakEnd": "13:00",
      "dayType": "TRABALHO",
      "status": "CONFIRMADA"
    }
  }
]
```

**No app:** calcular `proxima_acao` no client:

```typescript
function nextPunchAction(day: TimeClockDay | null): TimeClockEntryType | null {
  if (!day?.clockIn) return "ENTRADA";
  if (!day.breakStart) return "INTERVALO_INICIO";
  if (!day.breakEnd) return "INTERVALO_FIM";
  if (!day.clockOut) return "SAIDA";
  return null; // dia completo
}
```

Formatar horários com `toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })`.

### 4.3 Histórico — `GET /api/colaborador-app/ponto/historico`

Query: `periodStart=2026-06-01&periodEnd=2026-06-30`

Mesma estrutura do item do array acima, ordenado por data decrescente.

### 4.4 Minha escala — `GET /api/colaborador-app/escala`

Query: `periodStart=2026-06-21&periodEnd=2026-06-27`

**Resposta (array):**

```json
[
  {
    "id": "...",
    "scheduleDate": "2026-06-21T00:00:00.000Z",
    "dayOfWeek": 1,
    "dayType": "TRABALHO",
    "startTime": "08:00",
    "endTime": "18:00",
    "breakStart": "12:00",
    "breakEnd": "13:00",
    "status": "CONFIRMADA",
    "notes": null,
    "isRecurring": true,
    "isException": false,
    "employee": { "name": "Carlos", "jobTitle": { "name": "Mecânico" } }
  },
  {
    "scheduleDate": "2026-06-23T00:00:00.000Z",
    "dayType": "FOLGA",
    "startTime": null,
    "endTime": null,
    "status": "CONFIRMADA"
  }
]
```

**Mapeamento `dayType` → label UI:**

| API | UI |
|-----|-----|
| TRABALHO | Trabalho |
| FOLGA | Folga |
| PLANTAO | Plantão |
| FERIADO | Feriado |
| COMPENSACAO | Compensação |
| AFASTADO | Afastado |
| TREINAMENTO | Treinamento |
| OUTRO | Outro |

**`dayOfWeek`:** 0=Dom, 1=Seg, ..., 6=Sáb

### 4.5 Solicitações — GET/POST `/api/colaborador-app/solicitacoes`

**Listagem:**

```json
[
  {
    "id": "...",
    "requestType": "FOLGA",
    "referenceDate": "2026-06-25T00:00:00.000Z",
    "description": "Motivo pessoal",
    "attachmentUrl": null,
    "status": "ENVIADA",
    "rejectionReason": null,
    "createdAt": "2026-06-21T15:00:00.000Z",
    "employee": { "name": "Carlos" }
  }
]
```

**Criar — POST body:**

```json
{
  "requestType": "FOLGA",
  "referenceDate": "2026-06-25",
  "description": "Solicito folga neste dia.",
  "attachmentUrl": "https://...",
  "metadata": {
    "startTime": "08:00",
    "endTime": "18:00"
  }
}
```

**Tipos `requestType`:**

| API | Uso |
|-----|-----|
| `FOLGA` | Pedir folga |
| `TROCA_ESCALA` | Troca de turno (usar `metadata` com horários) |
| `AJUSTE_PONTO` | Ajuste de batida (metadata: clockIn, breakStart, breakEnd, clockOut ISO) |
| `JUSTIFICATIVA_ATRASO` | Justificar atraso |
| `JUSTIFICATIVA_FALTA` | Justificar falta |
| `OBSERVACAO_GERENTE` | Mensagem ao gerente |

**Status:** `ENVIADA`, `EM_ANALISE`, `APROVADA`, `RECUSADA`, `CANCELADA`

> Cancelar solicitação: existe no ERP em `PATCH /api/solicitacoes-funcionarios/:id/cancelar` — adicionar wrapper no app quando backend expor em colaborador-app, ou chamar rota ERP se usuário tiver permissão.

---

## 5. ENDPOINTS DO ERP — OS, COMISSÕES, DESEMPENHO

Estes módulos **existem no ERP** mas ainda **não têm namespace `/colaborador-app` dedicado**. O app deve:

1. Consumir rotas ERP existentes **se o funcionário tiver permissão**, OU
2. Exibir "Em breve" até backend criar wrappers `/colaborador-app/*`

### 5.1 Comissões (requer `commissions.view` no perfil)

| Método | Rota | Query |
|--------|------|-------|
| GET | `/api/team/commissions` | `employeeId`, `status` |

Status Prisma: `PENDENTE`, `APROVADA`, `PAGA`, etc.

**Importante:** perfil **mecânico** padrão hoje **não** inclui `commissions.view`. Para o app mostrar comissões, o gerente deve:
- adicionar permissão `commissions.view` ao role mecânico no ERP, **ou**
- backend implementar `GET /colaborador-app/comissoes` com escopo automático do funcionário logado

### 5.2 Produtividade / Desempenho (requer `commissions.view` + gestor)

| Método | Rota |
|--------|------|
| GET | `/api/team/productivity?periodStart=&periodEnd=&employeeId=` |

Retorna OS finalizadas, serviços executados, mão de obra, comissões por funcionário.

### 5.3 Ordens de Serviço

| Método | Rota | Notas |
|--------|------|-------|
| GET | `/api/service-orders` | Lista OS — filtrar no app por participação do funcionário |
| GET | `/api/service-orders/:id` | Detalhe |

Funcionário com `service_orders.manage` vê OS operacionais. Para "minhas OS" filtradas, ideal criar futuramente `GET /colaborador-app/minhas-os`.

### 5.4 Ainda NÃO implementados no backend

Criar services que lançam erro até existir API:

| Endpoint desejado | Status |
|-------------------|--------|
| `GET /colaborador-app/dashboard` | ❌ Criar agregador no backend |
| `GET /colaborador-app/minhas-os` | ❌ Wrapper filtrado |
| `GET /colaborador-app/minhas-os/:id` | ❌ Wrapper |
| `GET /colaborador-app/comissoes` | ❌ Wrapper com escopo próprio |
| `GET /colaborador-app/comunicados` | ❌ Módulo comunicados |
| `GET /colaborador-app/desempenho` | ❌ Wrapper productivity |
| `GET /colaborador-app/documentos` | ❌ Usar `EmployeeDocument` |
| `POST /colaborador-app/push-token` | ❌ Preparar FCM |
| `POST /colaborador-app/logout` | ⚠️ Logout local (apagar token) — JWT stateless |

**Para MVP do APK:** implementar telas **Ponto**, **Escala**, **Solicitações**, **Login/Perfil** com API real. Demais telas: UI pronta + empty state "Aguardando integração".

---

## 6. PERMISSÕES DO FUNCIONÁRIO (backend)

Slugs relevantes para o app:

```
ponto.ver              → ver próprio ponto
ponto.bater            → registrar batidas
escalas.ver            → ver própria escala
solicitacoes.ver       → ver próprias solicitações
solicitacoes.criar     → criar solicitações
commissions.view       → ver comissões (se liberado)
service_orders.manage  → ver/atuar em OS
admin.access / team.manage → acesso amplo (não usar no app colaborador comum)
```

**Regra:** backend filtra por `employeeId` vinculado ao `memberId` do JWT. Funcionário **nunca** envia `employeeId` de outro (exceto gestores).

---

## 7. MODELO DE DADOS (referência — app NÃO acessa direto)

| Conceito app | Model Prisma / Tabela |
|--------------|----------------------|
| Oficina | `Organization` |
| Funcionário | `Employee` (link `memberId` → usuário login) |
| Usuário | `User` + `OrganizationMember` |
| Escala | `EmployeeSchedule` |
| Batida ponto | `EmployeeTimeClockEntry` |
| Resumo dia ponto | `EmployeeTimeClockDay` |
| Solicitação | `EmployeeRequest` |
| Comissão | `GeneratedCommission` |
| OS | `ServiceOrder` |

---

## 8. ESTRUTURA DE PASTAS DO APP

```
/src
  /assets/images
  /components
    AppButton.tsx, AppCard.tsx, Header.tsx, StatusBadge.tsx
    MetricCard.tsx, CommissionCard.tsx, OrderCard.tsx
    ScheduleCard.tsx, TimeClockCard.tsx, RequestCard.tsx
    EmptyState.tsx, ErrorState.tsx, LoadingScreen.tsx
    BottomTabBar.tsx, InputField.tsx, SectionTitle.tsx
  /config
    api.ts, theme.ts, branding.ts
  /contexts
    AuthContext.tsx
  /navigation
    AppNavigator.tsx, AuthNavigator.tsx, BottomTabs.tsx
  /screens
    /auth/LoginScreen.tsx
    /app
      HomeScreen.tsx
      MyOrdersScreen.tsx
      OrderDetailsScreen.tsx
      CommissionsScreen.tsx
      CommissionDetailsScreen.tsx
      TimeClockScreen.tsx
      ScheduleScreen.tsx
      RequestsScreen.tsx
      NewRequestScreen.tsx
      AnnouncementsScreen.tsx
      PerformanceScreen.tsx
      DocumentsScreen.tsx
      ProfileScreen.tsx
      OfflineScreen.tsx
  /services
    httpClient.ts
    authService.ts
    dashboardService.ts
    employeeOrderService.ts
    commissionService.ts
    timeClockService.ts      ← USA API REAL colaborador-app
    scheduleService.ts       ← USA API REAL colaborador-app
    requestService.ts        ← USA API REAL colaborador-app
    announcementService.ts
    performanceService.ts
    documentService.ts
    notificationService.ts
  /types
    api.ts, auth.ts, timeClock.ts, schedule.ts, request.ts, ...
  /utils
    formatCurrency.ts, formatDate.ts, errors.ts, mapApiEnums.ts
  App.tsx
```

---

## 9. HTTP CLIENT (Axios)

```typescript
// src/services/httpClient.ts — requisitos
// - baseURL: API_BASE_URL
// - timeout: 30000
// - interceptor request: Authorization Bearer
// - interceptor response:
//     401 → limpar token, navegar Login
//     403 → toast "Sem permissão"
//     500 → ErrorState genérico
// - NetInfo antes de request → OfflineScreen
```

---

## 10. CAMADA DE ADAPTER (OBRIGATÓRIA)

Criar `src/utils/mapApiEnums.ts` para traduzir API ↔ UI:

```typescript
export const PUNCH_UI_TO_API = {
  entrada: "ENTRADA",
  intervalo_inicio: "INTERVALO_INICIO",
  intervalo_fim: "INTERVALO_FIM",
  saida: "SAIDA",
} as const;

export const REQUEST_UI_TO_API = {
  folga: "FOLGA",
  troca_escala: "TROCA_ESCALA",
  ajuste_ponto: "AJUSTE_PONTO",
  justificativa_atraso: "JUSTIFICATIVA_ATRASO",
  justificativa_falta: "JUSTIFICATIVA_FALTA",
  observacao_gerente: "OBSERVACAO_GERENTE",
} as const;
```

**Login adapter:**

```typescript
// authService.login(email, password)
// → POST /auth/login
// → salvar accessToken
// → GET /auth/me (opcional refresh)
// → mapear para User local { id, nome, email, role, permissions, organizationId }
```

**Resolver funcionário logado:**

Após login, se precisar de `employeeId` para UI, chamar endpoint futuro `GET /colaborador-app/me` ou inferir dos responses de ponto/escala (campo `employee.id`).

---

## 11. NAVEGAÇÃO

**Bottom Tabs (5):**

1. **Início** — HomeScreen (resumo; MVP pode montar client-side com ponto + escala)
2. **OS** — MyOrdersScreen
3. **Comissões** — CommissionsScreen
4. **Ponto** — TimeClockScreen ✅ API pronta
5. **Perfil** — ProfileScreen

**Stack interno:** Detalhe OS, Detalhe comissão, Escala, Solicitações, Nova solicitação, Comunicados, Desempenho, Documentos.

---

## 12. TELAS — ESPECIFICAÇÃO + INTEGRAÇÃO

### 12.1 LoginScreen ✅

- Logo da oficina (de `/auth/branding` ou asset local)
- Campos: **E-mail** + **Senha**
- `POST /api/auth/login`
- Salvar `accessToken` em SecureStore
- Carregar permissões para esconder abas sem acesso

### 12.2 TimeClockScreen ✅ PRIORIDADE MÁXIMA

- `GET /colaborador-app/ponto/hoje` ao abrir
- Cards: Entrada, Intervalo, Saída, Total parcial, Status
- Botão dinâmico conforme `nextPunchAction()`
- `POST /colaborador-app/ponto/bater` com `entryType`
- Opcional: Location → latitude/longitude
- Link: Ver histórico (lista `GET /colaborador-app/ponto/historico`)
- Aviso legal discreto (texto seção 3.2)

### 12.3 ScheduleScreen ✅

- `GET /colaborador-app/escala?periodStart=&periodEnd=` (semana atual)
- Vista semanal + próximo turno destacado
- Cores por `dayType`
- Botões: Solicitar folga / troca → NewRequestScreen

### 12.4 RequestsScreen + NewRequestScreen ✅

- Lista: `GET /colaborador-app/solicitacoes`
- Criar: `POST /colaborador-app/solicitacoes`
- Filtros por status e tipo
- Badge de status colorido

### 12.5 ProfileScreen ✅

- `GET /api/auth/me`
- Nome, e-mail, role, oficina
- Links: Escala, Solicitações, Sair (limpar token local)

### 12.6 HomeScreen — MVP híbrido

Montar resumo chamando em paralelo:

```typescript
Promise.all([
  api.get("/colaborador-app/ponto/hoje"),
  api.get("/colaborador-app/escala?periodStart=hoje&periodEnd=+7d"),
  // futuro: dashboard, comunicados
]);
```

Cards: ponto do dia, próxima escala, atalhos.

### 12.7 CommissionsScreen / MyOrdersScreen — aguardando backend

UI completa + empty state. Quando `GET /colaborador-app/comissoes` existir, plugar service.

---

## 13. IDENTIDADE VISUAL

```typescript
// src/config/branding.ts — ajustar com /auth/branding + logo anexo
export const branding = {
  appName: "Oficina do Beto Colaborador",
  companyName: "Oficina do Beto",
  subtitle: "App do Funcionário",
  primaryColor: "#0057D9",
  secondaryColor: "#E11D2E",
  accentColor: "#D4A63A",
  backgroundColor: "#F7F8FA",
  cardColor: "#FFFFFF",
  textPrimary: "#111827",
  textSecondary: "#6B7280",
  successColor: "#22C55E",
  warningColor: "#F59E0B",
  dangerColor: "#E11D2E",
};
```

Buscar branding dinâmico:

```
GET /api/auth/branding → { name, logoUrl, primaryColor, accentColor, ... }
```

---

## 14. TYPESCRIPT — TIPOS ALINHADOS À API REAL

```typescript
export type AuthSession = {
  accessToken: string;
  user: { id: string; email: string; name: string; avatarUrl?: string | null };
  organizationId: string;
  organizationName: string;
  role: string;
  permissions: string[];
};

export type TimeClockEntryType =
  | "ENTRADA"
  | "INTERVALO_INICIO"
  | "INTERVALO_FIM"
  | "SAIDA";

export type TimeClockDay = {
  id: string;
  workDate: string;
  clockIn: string | null;
  breakStart: string | null;
  breakEnd: string | null;
  clockOut: string | null;
  workedMinutes: number;
  expectedMinutes: number;
  lateMinutes: number;
  overtimeMinutes: number;
  earlyLeaveMinutes: number;
  status: "VALIDO" | "PENDENTE" | "AJUSTADO" | "RECUSADO" | "CANCELADO";
  employee: { id: string; name: string; jobTitle?: { name: string } | null };
  schedule?: ScheduleItem | null;
};

export type ScheduleItem = {
  id: string;
  scheduleDate: string;
  dayOfWeek: number;
  dayType: string;
  startTime: string | null;
  endTime: string | null;
  breakStart: string | null;
  breakEnd: string | null;
  status: string;
};

export type EmployeeRequest = {
  id: string;
  requestType: string;
  referenceDate: string;
  description: string;
  status: string;
  rejectionReason: string | null;
  createdAt: string;
};
```

---

## 15. SERVICES — IMPLEMENTAÇÃO REAL (exemplos)

```typescript
// timeClockService.ts
export async function getTodayTimeClock() {
  const { data } = await http.get<TimeClockDay[]>("/colaborador-app/ponto/hoje");
  return data[0] ?? null;
}

export async function punchClock(entryType: TimeClockEntryType, extras?: Partial<BaterPontoDto>) {
  const { data } = await http.post("/colaborador-app/ponto/bater", {
    entryType,
    ...extras,
  });
  return data;
}

export async function getTimeClockHistory(periodStart: string, periodEnd: string) {
  const { data } = await http.get<TimeClockDay[]>("/colaborador-app/ponto/historico", {
    params: { periodStart, periodEnd },
  });
  return data;
}

// scheduleService.ts
export async function getMySchedule(periodStart: string, periodEnd: string) {
  const { data } = await http.get<ScheduleItem[]>("/colaborador-app/escala", {
    params: { periodStart, periodEnd },
  });
  return data;
}

// requestService.ts
export async function getMyRequests() {
  const { data } = await http.get<EmployeeRequest[]>("/colaborador-app/solicitacoes");
  return data;
}

export async function createRequest(payload: {
  requestType: string;
  referenceDate: string;
  description: string;
  metadata?: Record<string, unknown>;
}) {
  const { data } = await http.post("/colaborador-app/solicitacoes", payload);
  return data;
}

// authService.ts
export async function login(email: string, password: string) {
  const { data } = await http.post<AuthSession>("/auth/login", { email, password });
  await SecureStore.setItemAsync("accessToken", data.accessToken);
  return data;
}
```

---

## 16. OFFLINE E ESTADOS DE UI

- **Loading:** skeleton ou spinner em toda lista
- **Empty:** "Nenhum registro encontrado"
- **Error:** mensagem da API (`error.response.data.message`) ou genérica
- **Offline (NetInfo):** OfflineScreen — bloquear bater ponto e criar solicitação
- **Pull to refresh** em Home, Ponto, Escala, Solicitações

---

## 17. NOTIFICAÇÕES (preparar)

Expo Notifications + registro futuro:

```
POST /api/colaborador-app/push-token  (a implementar no backend)
{ "token": "ExponentPushToken[...]", "platform": "android" }
```

Eventos futuros: comissão aprovada, escala alterada, solicitação respondida, comunicado novo.

---

## 18. ORDEM DE IMPLEMENTAÇÃO SUGERIDA (para o AI Studio)

**Fase 1 — MVP funcional (API 100% real):**
1. Projeto Expo + navegação + branding
2. httpClient + AuthContext
3. LoginScreen → `/auth/login`
4. TimeClockScreen → ponto hoje + bater + histórico
5. ScheduleScreen → minha escala
6. RequestsScreen + NewRequestScreen
7. ProfileScreen + logout local

**Fase 2 — Complementos:**
8. HomeScreen agregando ponto + escala
9. Telas OS/Comissões com empty state + TODO backend
10. Comunicados, Documentos, Desempenho (quando API existir)
11. Push notifications
12. Build APK (`eas build` ou `expo prebuild`)

---

## 19. CHECKLIST ANTES DE GERAR APK

- [ ] `EXPO_PUBLIC_API_BASE_URL` apontando para API de produção
- [ ] Login testado com usuário funcionário vinculado (`Employee.memberId`)
- [ ] Permissões `ponto.bater`, `escalas.ver`, `solicitacoes.criar` no role
- [ ] Bater sequência completa: entrada → intervalo → volta → saída
- [ ] Criar solicitação folga e ver na lista
- [ ] 401 desloga corretamente
- [ ] Offline bloqueia ações críticas
- [ ] Logo e cores da oficina aplicados
- [ ] Aviso legal na tela de ponto visível

---

## 20. FRASE DO PRODUTO

> O funcionário acompanha suas ordens executadas, comissões, escala, ponto e comunicados direto pelo aplicativo — com segurança, transparência e integração real com o ERP da oficina.

---

## 21. REFERÊNCIA TÉCNICA NO REPOSITÓRIO ERP

Documentação interna complementar:

- `PONTO_ESCALAS_IMPLEMENTACAO.md` — models, regras, endpoints ERP web
- `apps/api/src/colaborador-app/colaborador-app.controller.ts` — rotas do app
- `apps/api/src/ponto/`, `escalas/`, `solicitacoes-funcionarios/` — services

**Contato API base (exemplo dev):** `http://localhost:3000/api`  
**Produção:** URL Vercel/hosting da API NestJS do projeto.

---

## 22. INSTRUÇÃO FINAL PARA O GOOGLE AI STUDIO

Gere o aplicativo **App Colaborador** completo em Expo/React Native/TypeScript seguindo este documento.

**Priorize integração real** com:
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/auth/branding`
- `/api/colaborador-app/ponto/*`
- `/api/colaborador-app/escala`
- `/api/colaborador-app/solicitacoes`

**Não use mock.** Para endpoints ainda não existentes (dashboard, minhas-os, comissões dedicadas, comunicados), crie a UI e services que lançam `"Endpoint ainda não implementado no backend"`.

Use as **imagens anexadas** como referência visual obrigatória da marca.

Entregue código organizado, pronto para `npx expo start` e build APK Android.
