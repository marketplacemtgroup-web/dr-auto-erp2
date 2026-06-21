# Ponto e Escalas — Implementação

Documentação do módulo de **Ponto Digital**, **Escalas** e **Solicitações** no ERP Oficina Beto.

> **Aviso:** Controle interno de ponto e escala. Para uso oficial trabalhista, valide as regras com a contabilidade da oficina.

---

## Models Prisma criados

| Model | Tabela | Descrição |
|-------|--------|-----------|
| `EmployeeScheduleRecurrence` | `employee_schedule_recurrences` | Recorrência semanal de escala |
| `EmployeeSchedule` | `employee_schedules` | Escala por funcionário/data |
| `EmployeeScheduleHistory` | `employee_schedule_histories` | Histórico de alterações de escala |
| `EmployeeTimeClockEntry` | `employee_time_clock_entries` | Batidas individuais de ponto |
| `EmployeeTimeClockDay` | `employee_time_clock_days` | Resumo diário (entrada, intervalo, saída, totais) |
| `EmployeeRequest` | `employee_requests` | Solicitações (folga, ajuste, etc.) |

### Enums

- `ScheduleDayType`: TRABALHO, FOLGA, PLANTAO, FERIADO, COMPENSACAO, AFASTADO, TREINAMENTO, OUTRO
- `ScheduleStatus`: PLANEJADA, CONFIRMADA, ALTERADA, CANCELADA
- `TimeClockEntryType`: ENTRADA, INTERVALO_INICIO, INTERVALO_FIM, SAIDA
- `TimeClockStatus`: VALIDO, PENDENTE, AJUSTADO, RECUSADO, CANCELADO
- `TimeClockOrigin`: WEB, APP_COLABORADOR, APP_INTERNO, MANUAL_ADMIN
- `EmployeeRequestType`: AJUSTE_PONTO, JUSTIFICATIVA_ATRASO, JUSTIFICATIVA_FALTA, FOLGA, TROCA_ESCALA, OBSERVACAO_GERENTE
- `EmployeeRequestStatus`: ENVIADA, EM_ANALISE, APROVADA, RECUSADA, CANCELADA

**Convenções:** `organizationId` (tenant), `employeeId` (funcionário), camelCase no Prisma com `@map` snake_case no PostgreSQL.

**Migration:** `packages/database/prisma/migrations/20260621120000_ponto_escalas/migration.sql`

---

## Permissões criadas

| Slug | Descrição |
|------|-----------|
| `ponto.ver` | Ver próprio ponto |
| `ponto.ver_todos` | Ver ponto da equipe |
| `ponto.bater` | Registrar ponto |
| `ponto.ajustar` | Ajuste manual |
| `ponto.aprovar_ajuste` | Aprovar/recusar ajustes |
| `ponto.exportar` | Exportar relatórios |
| `escalas.ver` | Ver própria escala |
| `escalas.ver_todas` | Ver escalas da equipe |
| `escalas.criar` | Criar escalas |
| `escalas.editar` | Editar escalas |
| `escalas.cancelar` | Cancelar escalas |
| `escalas.exportar` | Exportar relatórios |
| `solicitacoes.ver` | Ver solicitações |
| `solicitacoes.criar` | Criar solicitações |
| `solicitacoes.aprovar` | Aprovar |
| `solicitacoes.recusar` | Recusar |

**Perfis padrão atualizados** em `apps/api/src/team/default-roles.ts`:
- **Gerente:** todas as permissões de ponto/escalas/solicitações
- **Mecânico / Recepção:** ponto próprio + escalas próprias + solicitações
- **Financeiro:** visualização e exportação

Admin (`admin.access`) e `team.manage` continuam com acesso total.

---

## Endpoints API

Base: `/api` (JWT Bearer)

### Escalas — `/api/escalas`

| Método | Rota | Permissão | Descrição |
|--------|------|-----------|-----------|
| GET | `/stats` | escalas.ver* | KPIs do dia/semana |
| GET | `/` | escalas.ver* | Lista com filtros |
| GET | `/relatorio` | escalas.exportar | Relatório por período |
| GET | `/minha-escala` | escalas.ver | Escala do usuário logado |
| GET | `/funcionario/:employeeId` | escalas.ver* | Escala por funcionário |
| GET | `/:id` | escalas.ver* | Detalhe + histórico |
| POST | `/` | escalas.criar | Nova escala ou exceção |
| POST | `/recorrencia` | escalas.criar | Recorrência semanal |
| PATCH | `/:id` | escalas.editar | Atualizar |
| DELETE | `/:id` | escalas.cancelar | Cancelar (status CANCELADA) |

### Ponto — `/api/ponto`

| Método | Rota | Permissão | Descrição |
|--------|------|-----------|-----------|
| GET | `/hoje` | ponto.ver* | Registros do dia |
| GET | `/painel` | ponto.ver* | KPIs + tabela do dia |
| POST | `/bater` | ponto.bater | Registrar batida |
| GET | `/historico` | ponto.ver* | Histórico por período |
| GET | `/ajustes-pendentes` | ponto.aprovar_ajuste | Ajustes aguardando |
| GET | `/relatorio` | ponto.exportar | Relatório de horas |
| GET | `/funcionario/:employeeId` | ponto.ver* | Detalhe do funcionário |
| POST | `/ajuste` | ponto.ajustar | Ajuste manual |
| PATCH | `/ajuste/:id/aprovar` | ponto.aprovar_ajuste | Aprovar ajuste |
| PATCH | `/ajuste/:id/recusar` | ponto.aprovar_ajuste | Recusar ajuste |

### Solicitações — `/api/solicitacoes-funcionarios`

| Método | Rota | Permissão | Descrição |
|--------|------|-----------|-----------|
| GET | `/` | solicitacoes.ver* | Lista |
| GET | `/:id` | solicitacoes.ver* | Detalhe |
| POST | `/` | solicitacoes.criar | Nova solicitação |
| PATCH | `/:id/aprovar` | solicitacoes.aprovar | Aprovar (+ efeitos colaterais) |
| PATCH | `/:id/recusar` | solicitacoes.recusar | Recusar |
| PATCH | `/:id/cancelar` | solicitacoes.criar/aprovar | Cancelar |

### App Colaborador (futuro) — `/api/colaborador-app`

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/ponto/hoje` | Meu ponto do dia |
| POST | `/ponto/bater` | Bater ponto (origem APP_COLABORADOR) |
| GET | `/ponto/historico` | Meu histórico |
| GET | `/escala` | Minha escala |
| GET | `/solicitacoes` | Minhas solicitações |
| POST | `/solicitacoes` | Criar solicitação |

---

## Telas Web (ERP)

| Rota | Arquivo | Funcionalidades |
|------|---------|-----------------|
| `/dashboard/equipe/escalas` | `app/src/pages/team/EscalasPage.tsx` | KPIs, lista, calendário, nova escala/recorrência |
| `/dashboard/equipe/ponto` | `app/src/pages/team/PontoPage.tsx` | Painel do dia, bater ponto, histórico, ajustes, relatório |
| `/dashboard/equipe/solicitacoes` | `app/src/pages/team/SolicitacoesPage.tsx` | Lista, filtros, criar, aprovar/recusar/cancelar |

Menu: **Equipe & Comissões** → abas Escalas, Ponto, Solicitações (`TeamLayout.tsx`).

---

## Regras de negócio implementadas

### Ponto
1. Saída exige entrada registrada
2. Intervalo fim exige intervalo início
3. Dupla entrada no mesmo dia bloqueada (exceto via ajuste admin)
4. Funcionário inativo não bate ponto
5. Cada batida gera `EmployeeTimeClockEntry`
6. Resumo diário em `EmployeeTimeClockDay` recalculado após cada batida
7. Cálculo de horas trabalhadas (descontando intervalo)
8. Comparação com escala quando existir
9. Atraso, saída antecipada e hora extra estimada
10. Ajuste manual registra `adjustedById` / `adjustedAt`
11. Aprovação/recusa de ajustes pendentes
12. Logs em `TeamActionLog`

### Escalas
1. Funcionário inativo não recebe nova escala
2. Recorrência semanal via `EmployeeScheduleRecurrence`
3. Exceções por data (`isException`)
4. Folga, plantão e demais tipos
5. Cancelamento via status CANCELADA
6. Conflito de trabalho/plantão no mesmo dia bloqueado
7. Histórico em `EmployeeScheduleHistory`

### Solicitações
1. Funcionário cria solicitação própria
2. Escopo: vê só as suas (exceto gestores)
3. Aprovação de folga → cria escala FOLGA
4. Aprovação de troca escala → cria escala TRABALHO
5. Aprovação de ajuste ponto → chama serviço de ajuste
6. Aprovação/recusa salva responsável e data

---

## Como testar

### 1. Aplicar migration e permissões

```bash
cd packages/database
npx prisma migrate deploy
npx prisma db seed
```

Ou em dev:

```bash
npx prisma migrate dev
```

### 2. Subir API e Web

```bash
# raiz do monorepo
npm run dev
```

### 3. Fluxo sugerido

1. Login como **admin/gerente**
2. **Equipe → Escalas:** criar escala recorrente para um funcionário ativo com acesso
3. **Equipe → Ponto:** login como funcionário (mecânico) e bater entrada/intervalo/saída
4. **Equipe → Ponto → Ajustes:** gerente aprova ajuste manual se necessário
5. **Equipe → Solicitações:** funcionário solicita folga; gerente aprova
6. Verificar relatórios nas abas Histórico/Relatório

### 4. Testar API (curl)

```bash
TOKEN="..."
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/escalas/stats
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"entryType":"ENTRADA"}' http://localhost:3000/api/ponto/bater
```

---

## Arquivos principais

**Backend:**
- `packages/database/prisma/schema.prisma`
- `packages/database/src/system-permissions.ts`
- `apps/api/src/escalas/`
- `apps/api/src/ponto/`
- `apps/api/src/solicitacoes-funcionarios/`
- `apps/api/src/colaborador-app/`
- `apps/api/src/shared/employee-scope.service.ts`
- `apps/api/src/shared/time-clock.utils.ts`

**Frontend:**
- `app/src/pages/team/EscalasPage.tsx`
- `app/src/pages/team/PontoPage.tsx`
- `app/src/pages/team/SolicitacoesPage.tsx`
- `app/src/lib/api.ts`
- `app/src/layouts/TeamLayout.tsx`

---

## Pendências / próximos passos

- [ ] Tela dedicada de detalhe por funcionário (escala + ponto consolidado)
- [ ] Exportação CSV/PDF dos relatórios
- [ ] Notificações push para aprovações pendentes
- [ ] Geolocalização obrigatória no app colaborador (configurável)
- [ ] Integração opcional com folha interna (`Payroll`)
- [ ] Endpoint REST para listar `TeamActionLog` do módulo ponto/escalas
- [ ] Sincronizar permissões no frontend para ocultar abas por perfil (hoje gestão fina é no backend)
- [ ] App Colaborador Android consumindo `/api/colaborador-app/*`

---

## Observações de compatibilidade

- **Nenhum módulo existente foi alterado** além de: export de `TeamActionLogService`, novas permissões no seed e perfis padrão.
- Models usam `Employee` e `Organization` existentes.
- Funcionários inativos: histórico preservado; novas ações bloqueadas.
- Usuário sem vínculo `Employee` precisa de permissão de gestor ou cadastro vinculado via `memberId`.
