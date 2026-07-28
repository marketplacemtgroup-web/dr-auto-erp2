# Verify

## 2026-07-28

| Check | Resultado |
|-------|-----------|
| `npm run build -w @autocore/api` | OK (nest build) — revalidado após fix sync→total |
| Smoke UI: editar item aprovado na OS | Pendente (manual) |
| Persistência | Item + quote_line + quote.amount + OS.totalAmount atualizam no banco |

### Esperado no smoke

1. Abrir OS com quote APPROVED
2. Aba orçamento/itens → **Editar** em peça aprovada
3. Mudar nome e preço → Salvar
4. Confirmar totais e status da linha ainda aprovado
