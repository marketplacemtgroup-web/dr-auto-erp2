# Portal do Cliente — Guia para o Cliente e Deploy na Vercel

Documento para repassar ao cliente final e para quem for publicar o portal na internet (Vercel).

---

## 1. O que mudou

O **Portal do Cliente** passou a funcionar **no navegador** (site), com a mesma experiência que existia no aplicativo Android de acompanhamento de OS.

| Antes | Agora |
|-------|--------|
| Cliente acessava pelo app Android | Cliente acessa pelo **site** (link no WhatsApp, QR code, etc.) |
| App com telas de login, início, OS, notificações e perfil | **Mesmas telas**, adaptadas para celular e computador |
| Aplicativo com outra função no futuro | Portal web é o canal oficial do cliente por enquanto |

O cliente **não precisa instalar nada**. Pode salvar o site na tela inicial do celular (PWA), se quiser.

---

## 2. O que o cliente consegue fazer no portal

### Acesso

- Entrar com **CPF** + **placa do veículo** (a placa funciona como senha).
- Ou abrir o **link mágico** enviado pela oficina: `https://SEU-PORTAL.vercel.app/acesso/TOKEN`

### Telas disponíveis

| Área | Função |
|------|--------|
| **Início** | Saudação, dados do veículo, OS em andamento, orçamentos pendentes |
| **Minhas OS** | Lista com filtros: Todas / Em andamento / Finalizadas |
| **Detalhe da OS** | Status, linha do tempo, fotos/vídeos, aprovar ou recusar orçamento |
| **Notificações** | Alertas da oficina; opção “Marcar lidas” |
| **Perfil** | Dados do cliente, oficina vinculada, suporte, veículos, histórico, privacidade |
| **Suporte** | WhatsApp, telefone e endereço da oficina |

### Orçamento público (sem login)

Link enviado pela oficina: `https://SEU-PORTAL.vercel.app/orcamento/TOKEN` — o cliente aprova ou recusa sem CPF/placa.

---

## 3. URLs do sistema (visão geral)

Em produção você terá **três endereços** na Vercel:

| Sistema | Quem usa | Exemplo de URL |
|---------|----------|----------------|
| **API** | Backend (não abre para o cliente) | `https://oficina-beto-api.vercel.app` |
| **ERP (Dashboard)** | Oficina / equipe | `https://oficina-beto-erp.vercel.app` |
| **Portal do Cliente** | Cliente final | `https://oficina-beto-portal.vercel.app` |

O cliente só precisa conhecer o link do **Portal**.

---

## 4. Personalizar logo e marca da oficina

### Logo (recomendado — pelo sistema)

No **primeiro cadastro** do ERP (`/cadastro`) ou depois em **Configurações → Visual**, envie o logo em **PNG, JPEG, JPG ou WebP** (até 5 MB).

O arquivo vai para o storage (Supabase) e passa a valer automaticamente em:

- ERP (login, sidebar, telas)
- Portal do cliente (splash, login, cabeçalho)
- Impressões de OS e orçamento

Não é preciso redeploy na Vercel só para trocar o logo.

**Supabase:** execute no SQL Editor o script [`scripts/supabase-storage-buckets.sql`](../scripts/supabase-storage-buckets.sql) — inclui o bucket público `branding`.

### Fundo do portal (imagem da moto)

Ainda pode ser trocado por deploy, na pasta:

```
apps/portal/public/branding/background.webp
```

Ou via variável `VITE_BRAND_BACKGROUND_URL` na Vercel.

### Logo padrão de fallback (antes do cadastro)

Enquanto ninguém cadastrou a oficina, o portal usa os arquivos em `apps/portal/public/branding/logo.png`.

### Um sistema por cliente (recomendado)

Cada oficina deve ter **deploy próprio** na Vercel (API + ERP + Portal) e banco Supabase dedicado. O logo é daquela instalação — não misture várias oficinas no mesmo deploy.

---

## 5. Deploy do Portal na Vercel (passo a passo)

> **Ordem importante:** a **API** precisa estar no ar antes do portal. O ERP também deve ter `VITE_PORTAL_URL` apontando para o portal.

### Pré-requisitos

- Conta em [vercel.com](https://vercel.com)
- Repositório do projeto no GitHub (ou GitLab/Bitbucket conectado à Vercel)
- URL da API já publicada (ex.: `https://oficina-beto-api.vercel.app`)
- URL do ERP já publicada (ex.: `https://oficina-beto-erp.vercel.app`)

### 5.1 Criar o projeto do Portal

1. Acesse [vercel.com](https://vercel.com) → **Add New…** → **Project**.
2. Importe o repositório **oficina-beto** (ou o nome do seu repo).
3. Em **Root Directory**, clique em **Edit** e selecione:

   ```
   apps/portal
   ```

4. Framework: **Vite** (a Vercel detecta automaticamente; o `vercel.json` da pasta já define build e rotas).

5. **Build Command** (já configurado em `apps/portal/vercel.json`):

   ```
   cd ../.. && npm run build -w @autocore/portal
   ```

6. **Output Directory:** `dist`

7. **Install Command** (monorepo):

   ```
   cd ../.. && npm ci --include=dev
   ```

### 5.2 Variáveis de ambiente (Portal)

Em **Settings → Environment Variables** do projeto **portal**, adicione para **Production** (e Preview, se quiser):

| Variável | Valor | Observação |
|----------|--------|------------|
| `VITE_API_URL` | `https://SUA-API.vercel.app` | **Sem** `/` no final; **sem** `/api` |
| `VITE_DASHBOARD_URL` | `https://SEU-ERP.vercel.app` | Link “É da oficina?” no login |
| `VITE_APP_NAME` | `OFICINA DO BETO` | Nome exibido no portal |
| `VITE_APP_TAGLINE` | `Portal do Cliente` | Subtítulo |
| `VITE_BRAND_LOGO_URL` | `/branding/logo.png` | Opcional se usar pasta padrão |
| `VITE_BRAND_BACKGROUND_URL` | `/branding/background.webp` | Opcional |

Exemplo real:

```env
VITE_API_URL=https://oficina-beto-api.vercel.app
VITE_DASHBOARD_URL=https://oficina-beto-erp.vercel.app
VITE_APP_NAME=OFICINA DO BETO
VITE_APP_TAGLINE=Portal do Cliente
```

### 5.3 Deploy

1. Clique em **Deploy**.
2. Aguarde o build terminar (verde).
3. Anote a URL gerada, ex.: `https://oficina-beto-portal.vercel.app`

### 5.4 Ajustar CORS na API (obrigatório)

No projeto da **API** na Vercel, variável `CORS_ORIGIN` deve incluir as URLs do ERP e do Portal, **sem barra no final**, separadas por vírgula:

```env
CORS_ORIGIN=https://oficina-beto-erp.vercel.app,https://oficina-beto-portal.vercel.app
```

Salve e faça **Redeploy** da API.

### 5.5 Ajustar o ERP

No projeto **ERP** (`app/`), confirme:

```env
VITE_API_URL=https://oficina-beto-api.vercel.app
VITE_PORTAL_URL=https://oficina-beto-portal.vercel.app
```

Redeploy do ERP para os links “Link portal” e orçamento público usarem o endereço certo.

---

## 6. Domínio próprio (opcional)

Depois do deploy na Vercel, você pode usar um domínio da oficina.

1. Vercel → projeto **portal** → **Settings** → **Domains**.
2. Adicione, por exemplo: `cliente.oficinadobeto.com.br`
3. Configure o DNS conforme a Vercel indicar (CNAME ou A).
4. Atualize:
   - `VITE_PORTAL_URL` no **ERP**
   - `CORS_ORIGIN` na **API** (inclua o novo domínio)
5. Redeploy API, ERP e Portal.

Sugestão de nomes:

| Domínio | Sistema |
|---------|---------|
| `app.suaoficina.com.br` | ERP (oficina) |
| `cliente.suaoficina.com.br` | Portal do cliente |
| `api.suaoficina.com.br` | API |

---

## 7. Como testar após o deploy

Checklist rápido:

- [ ] Abrir `https://SEU-PORTAL.vercel.app/splash` — tela de carregamento
- [ ] Login com CPF e placa de um cliente cadastrado no ERP
- [ ] Início mostra veículo e nome do cliente
- [ ] Abas inferiores: Início, OS, Notificações, Perfil
- [ ] Abrir uma OS e ver timeline / fotos (se houver)
- [ ] Link mágico: no ERP, na OS → copiar “Link portal” → abrir no celular
- [ ] Tema claro/escuro (botão no login ou cabeçalho)
- [ ] No celular: “Adicionar à tela inicial” (PWA)

### Se der erro de login ou CORS

1. Teste no navegador: `https://SUA-API.vercel.app/api/ping` → deve retornar `{"ok":true}`.
2. Confira `VITE_API_URL` no portal (URL correta, sem `/api` no final).
3. Confira `CORS_ORIGIN` na API com a URL exata do portal.
4. Veja **Deployments → Functions / Build Logs** na Vercel se o build falhou.

Mais detalhes técnicos: [`docs/DEPLOY-VERCEL.md`](./DEPLOY-VERCEL.md).

---

## 8. O que enviar para o cliente (mensagem pronta)

Você pode copiar e adaptar:

---

**Portal do Cliente — OFICINA DO BETO**

Olá! Seu acompanhamento de ordem de serviço agora é pelo **site**, no celular ou no computador.

**Link de acesso:** https://SEU-PORTAL.vercel.app

**Como entrar:**
1. Abra o link acima.
2. Digite seu **CPF** e a **placa** do veículo.
3. Acompanhe status, fotos, orçamentos e notificações.

Se a oficina enviar um **link direto** por WhatsApp, é só tocar nele — não precisa digitar CPF de novo.

**Dúvidas ou orçamento:** use o menu **Perfil → Suporte** ou fale com a oficina pelo WhatsApp.

Para instalar como atalho no celular: no Chrome, menu → **Adicionar à tela inicial**.

---

## 9. Resumo técnico (para você)

| Item | Detalhe |
|------|---------|
| Pasta do portal | `apps/portal` |
| Porta em desenvolvimento | `3001` (`npm run dev` na raiz do monorepo) |
| Entrada padrão | `/splash` → login ou home se já logado |
| API usada | Mesma do app Android: `/api/portal/*` |
| Branding | `apps/portal/public/branding/` |
| Config Vercel | `apps/portal/vercel.json` |

O aplicativo Android deixa de ser o canal do cliente; o **portal web** é o produto oficial de acompanhamento até nova definição.

---

## 10. Suporte e evolução

Funcionalidades já disponíveis no portal web:

- Login CPF + placa  
- Dashboard com veículo e OS  
- Lista e detalhe de OS  
- Aprovar / recusar orçamento  
- Notificações  
- Múltiplos veículos (troca na sessão)  
- Link mágico e orçamento público  
- Tema claro / escuro  
- PWA instalável  

Para novas personalizações (cores, textos, domínio, segunda oficina), altere branding, variáveis `VITE_*` na Vercel e redeploy.
