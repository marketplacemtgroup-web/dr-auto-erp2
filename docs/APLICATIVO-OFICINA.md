# App Android — OFICINA DO BETO

## Papel no ecossistema

| Cliente | Pasta | Público |
|---------|-------|---------|
| ERP web | `app/` | Administração completa |
| Portal web | `apps/portal/` | Cliente final |
| API | `apps/api/` | Backend compartilhado |
| **App Android** | `APLICATIVO OFICINA/` | Mecânico / recepção no chão de fábrica |

## Stack

- Kotlin, Jetpack Compose, Material 3
- Retrofit + OkHttp + Moshi
- DataStore (sessão JWT)
- Camera / galeria para checklist

## Variáveis de ambiente

| App | ERP equivalente |
|-----|-----------------|
| `API_BASE_URL` | `VITE_API_URL` (+ `/api/`) |
| `USE_MOCK_DATA` | — (só debug) |

## Status da OS

O app usa os 12 status do Prisma (`RECEIVED`, `DIAGNOSIS`, `IN_PROGRESS`, etc.). O checklist é salvo em `PATCH /service-orders/:id/checklist`; fotos vão para Supabase via módulo `attachments`.

## Permissões necessárias no usuário

- `dashboard.view`
- `service_orders.manage`
- `quotes.manage`
- `inventory.manage` (catálogo de peças no orçamento)

Perfis padrão `mecanico` e `recepcao` já incluem essas permissões.

## Troubleshooting

| Problema | Solução |
|----------|---------|
| Login falha | Confirme URL da API no `.env` |
| Emulador não conecta | Use `10.0.2.2` em vez de `localhost` |
| Cleartext HTTP | `usesCleartextTraffic` habilitado para dev local |
| Sessão expirada | Faça login novamente (401 limpa sessão) |
