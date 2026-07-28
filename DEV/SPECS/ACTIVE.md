# Spec ativa — Editar itens após aprovação do orçamento

Status: **done** (implementado; smoke manual pendente)

## Objetivo

Permitir editar nome e valores de peças/serviços do orçamento mesmo depois de aprovado e convertido em OS, sem obrigar deletar e recriar o orçamento.

## Escopo

- Liberar `updateItem` na API (sem bloqueio por `commercialLockedAt` / linha aprovada)
- UI da OS: editar itens com quote `APPROVED`
- Sync: ao alterar campos de linha já aprovada, **preservar** `approved`
- Manter painel de custo interno / “Atualizar peça comprada” como fluxo operacional opcional

## Fora de escopo

- Exigir reaprovação do cliente ao editar valores
- Mudança de RLS (não há RLS ativo nesse fluxo)

## Aceite

1. Em OS com orçamento aprovado, botão **Editar** aparece em todos os itens
2. Alterar descrição e `unitPrice` salva com sucesso
3. Totais da OS e do orçamento atualizam
4. Linha permanece aprovada (sem forçar PENDING só por editar)
5. Build API ok
