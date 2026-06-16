# WTEC Motors — instância dedicada

Este deploy é **um sistema por empresa**, não um SaaS com várias oficinas no mesmo banco.

- **Empresa:** WTEC Motors
- **Banco:** Supabase (projeto exclusivo da WTEC Motors)
- **NF-e:** desabilitado (sem emissão fiscal nesta versão)
- **WhatsApp / CRM:** desabilitados no menu

## Arquitetura

```
[Site + API]  ──►  [Supabase Postgres]
     │                    │
  um deploy           um projeto
  WTEC Motors         WTEC Motors
```

Não há cadastro de “nova oficina” depois da configuração inicial (`SINGLE_TENANT=true`).

## Variáveis importantes

| Variável | Valor sugerido |
|----------|----------------|
| `SINGLE_TENANT` | `true` |
| `DEFAULT_ORGANIZATION_NAME` | `WTEC Motors` |
| `VITE_APP_NAME` | `WTEC Motors` |
| `VITE_APP_TAGLINE` | `Studio especializado em linhas premium` |
| `VITE_SINGLE_TENANT` | `true` |

## Primeira subida (Supabase)

1. Crie o projeto Supabase **só para a WTEC Motors**
2. Copie `.env.supabase.example` → `.env` (e para `packages/database/.env`, `apps/api/.env`)
3. `npm run supabase:init` — schema + permissões
4. `npm run supabase:up` — API + web
5. Acesse `/cadastro` **uma vez** e crie o usuário administrador da WTEC Motors
6. Depois use só `/login` — o cadastro de nova empresa fica bloqueado

## Portal do cliente

Continua na raiz (`/`). Clientes entram com CPF + placa dos veículos **cadastrados na WTEC Motors**.

## Outra empresa no futuro

Duplique o deploy (novo Supabase + novo `.env` + outro domínio). Não compartilhe o mesmo banco entre empresas.
