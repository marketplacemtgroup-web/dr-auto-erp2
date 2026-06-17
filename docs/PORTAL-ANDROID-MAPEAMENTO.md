# Mapeamento Portal Android → API OFICINA DO BETO

Documento de referência para integração do app Android (`APK ANDROID`) com a API do portal do cliente (`/api/portal/*`).

## Arquitetura

```
App Android (Compose) → PortalRepository → Retrofit → NestJS /api/portal/*
Portal PWA (apps/portal) → mesma API
```

## Auth e sessão

| Tela Android | Composable | Endpoint | Campos API → Model Android |
|---|---|---|---|
| Splash | `SplashScreen` | — | Checar token DataStore → `GET /portal/dashboard` ou login |
| Login | `LoginScreen` | `POST /portal/login` | `{ cpf, plate }` → `accessToken`, `customerName`, `organizationName`, `plate` |
| Logout | `ProfileScreen` | — | Limpar DataStore + estado |

JWT: `Authorization: Bearer {token}` — 30 dias, escopo = 1 `vehicleId`.

## Home (`HomeScreen`)

| UI | Endpoint | Campo API | Model |
|---|---|---|---|
| Saudação | `GET /portal/dashboard` | `customer.name` | `Cliente.nome` |
| Card veículo | dashboard | `vehicle.*` | `Veiculo` |
| OS ativa | dashboard | `serviceOrders[0]` | `OrdemServico` resumido |
| Orçamento pendente | dashboard | `quotes` status `PENDING` | navegar com `quote.id` |
| WhatsApp | dashboard | `customer.whatsapp` \|\| `phone` \|\| `organization.phone` | `launchWhatsApp` |
| Badge notif. | Fase 2: `GET /portal/notifications` | Fase 1: count quotes PENDING | |

## Minhas OS (`OrdersScreen`)

| UI | Endpoint | Campo | Filtro client-side |
|---|---|---|---|
| Lista | dashboard | `serviceOrders[]` | Tab Todas / Em andamento / Finalizadas |

Status finalizados: `FINISHED`, `DELIVERED`, `CANCELLED`.

## Detalhe OS (`OrderDetailsScreen`)

| UI | Endpoint | Campo |
|---|---|---|
| Dados + timeline | `GET /portal/service-orders/:id` | `timeline[]`, `items[]`, `quotes[]` |
| Anexos | Fase 3 | `attachments[]` |

## Orçamento (`BudgetScreen`)

| Ação | Endpoint | Body |
|---|---|---|
| Aprovar | `PATCH /portal/quotes/:id/approve` | `{ lines?: [{ lineId, approved }] }` |
| Recusar | `PATCH /portal/quotes/:id/reject` | `{ comment? }` |

**Importante:** API usa `quoteId`, não `osId`.

## Notificações (Fase 2)

| UI | Endpoint |
|---|---|
| Lista | `GET /portal/notifications` |
| Marcar lida | `PATCH /portal/notifications/:id/read` |
| Marcar todas | `PATCH /portal/notifications/read-all` |

## Multi-veículo (Fase 2)

| UI | Endpoint |
|---|---|
| Lista | `GET /portal/vehicles` |
| Trocar | `POST /portal/switch-vehicle` `{ vehicleId }` → novo JWT |

## Mapper de status

| API enum | Label PT |
|---|---|
| `RECEIVED` | Recebido |
| `DIAGNOSIS` | Em diagnóstico |
| `AWAITING_APPROVAL` | Aguardando aprovação |
| `IN_PROGRESS` | Em execução |
| `FINISHED` | Finalizado |
| `DELIVERED` | Entregue |
| `CANCELLED` | Cancelado |

Implementação: `PortalStatusMapper.kt`.

## Backend — endpoints novos (Fase 2)

- `GET /portal/notifications`
- `PATCH /portal/notifications/:id/read`
- `PATCH /portal/notifications/read-all`
- `POST /portal/push/fcm-register`
- `GET /portal/vehicles`
- `POST /portal/switch-vehicle`

## Gaps resolvidos por fase

| Campo mock | Fase |
|---|---|
| `vehicle.currentKm` | 2 — incluído no dashboard |
| `Oficina.endereco` | 2 — `organization.address` no dashboard |
| Inbox notificações | 2 |
| Deep link `/acesso/:token` | 3 |
| Anexos Coil | 3 |
