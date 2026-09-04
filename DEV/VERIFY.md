# VERIFY

Atualizado: 2026-09-04 (hotfix P2024 pool + race filtros)

## Hotfix pool / financeiro UI

- [x] Causa: P2024 `connection_limit=1` + RolesBootstrap + GETs paralelos
- [x] `pool_timeout=30` + bootstrap roles atrasado 8s
- [x] FinancialPage: load sequencial entradas + cancel race; Histórico destacado
- [x] `npm run build -w @autocore/api` OK
- [ ] Smoke pós-deploy: `/api/auth/me` e financeiro sem 500 no cold start
- [ ] Smoke: filtros Todos os tipos / A pagar / A receber sem misturar
- [ ] Smoke: botão Histórico abre popup

## UX AR/AP anterior

- [x] Código + push `7e0f448`
- [ ] Smoke aceite UX (após estabilizar 500)
