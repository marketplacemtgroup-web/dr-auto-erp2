# Fase 6 — Portal do Cliente (PWA)

App separado: `apps/portal` (porta **3001**). ERP: `app` (porta **3000**).

## Desenvolvimento

```powershell
npm run dev
```

O portal já sobe com HTTPS e certificado para o IP da rede. Copie o link **https://...:3001/login** do terminal.

## Produção

Deploy do `apps/portal` em domínio HTTPS. O cliente instala o PWA pelo diálogo do navegador.

Ver `docs/ARQUITETURA-FRONTEND.md`.
