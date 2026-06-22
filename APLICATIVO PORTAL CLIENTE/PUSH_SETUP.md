# Push nativo (FCM) — Portal do Cliente Android

Dois lados precisam estar configurados:

| Lado | Arquivo / variável | Função |
|------|-------------------|--------|
| **App Android** | `app/google-services.json` | Celular **recebe** push |
| **API (Vercel)** | `FIREBASE_SERVICE_ACCOUNT` | Servidor **envia** push |

Projeto Firebase atual: **`oficina-do-beto-campinas`**  
Package Android: **`com.aistudio.portalcliente.wypbzx`**

---

## Parte A — App Android (você já fez)

- [x] `google-services.json` em `APLICATIVO PORTAL CLIENTE/app/`
- [x] `package_name` = `com.aistudio.portalcliente.wypbzx`
- [x] Código do app (permissão, FCM, notificação na bandeja)

Se mudar de projeto Firebase, baixe um novo `google-services.json` e faça rebuild do APK.

---

## Parte B — API na Vercel (falta fazer)

O `current_key` dentro do `google-services.json` **não serve** para a API.  
Você precisa da **conta de serviço** (Admin SDK).

### Passo 1 — Baixar a chave no Firebase

1. Abra (link direto do seu projeto):  
   https://console.firebase.google.com/project/oficina-do-beto-campinas/settings/serviceaccounts/adminsdk

2. Aba **Contas de serviço** (Service accounts).

3. Clique em **Gerar nova chave privada** → **Gerar chave**.

4. Salve o arquivo (ex.: `Downloads\oficina-do-beto-campinas-firebase-adminsdk-xxxxx.json`).

   **Não commite esse arquivo.** Não é o `google-services.json`.

5. Abra o JSON e confira:
   - `"project_id": "oficina-do-beto-campinas"`
   - `"type": "service_account"`
   - `"private_key": "-----BEGIN PRIVATE KEY-----..."`
   - `"client_email": "firebase-adminsdk-...@oficina-do-beto-campinas.iam.gserviceaccount.com"`

### Passo 2 — Gerar o valor para a Vercel

No PowerShell:

```powershell
cd "E:\OFICINA BETO\oficina-beto"
node scripts/setup-firebase-fcm.mjs "C:\Users\rlisb\Downloads\oficina-do-beto-campinas-firebase-adminsdk-xxxxx.json"
```

(substitua pelo caminho real do arquivo baixado)

O terminal imprime uma linha longa começando com:

```
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
```

Copie **só o valor** depois do `=` (o JSON inteiro em uma linha).

Se a Vercel truncar o texto, rode com base64:

```powershell
node scripts/setup-firebase-fcm.mjs --base64 "C:\caminho\do-arquivo.json"
```

e use a variável `FIREBASE_SERVICE_ACCOUNT_BASE64` na Vercel.

### Passo 3 — Colar na Vercel

1. https://vercel.com → login → projeto **oficina-beto-api**

2. **Settings** → **Environment Variables** → **Add New**

3. Preencha:
   - **Key:** `FIREBASE_SERVICE_ACCOUNT`
   - **Value:** cole o JSON inteiro (uma linha)
   - **Environments:** marque **Production** e **Preview**

4. **Save**

### Passo 4 — Redeploy obrigatório

Variável nova só vale após novo deploy:

1. Aba **Deployments**
2. Três pontinhos **⋯** no deploy mais recente
3. **Redeploy** → confirme

### Passo 5 — Confirmar que funcionou

Abra no navegador:

https://oficina-beto-api.vercel.app/api/env-check

Deve aparecer:

```json
{
  "ok": true,
  "push": {
    "firebaseFcm": true
  }
}
```

Se ainda `firebaseFcm: false`, confira redeploy e se o JSON foi colado completo.

---

## Parte C — Testar no celular

1. Rebuild e instale o APK (se trocou o `google-services.json`):

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
cd "E:\OFICINA BETO\oficina-beto\APLICATIVO PORTAL CLIENTE"
.\gradlew.bat assembleDebug
```

APK: `app/build/outputs/apk/debug/app-debug.apk`

2. Instale no celular, faça **login** no portal.

3. **Aceite** a permissão de notificações (Android 13+).

4. No ERP, altere o status de uma OS desse cliente.

5. **Teste com app fechado:** remova o app dos recentes (não use “Forçar parada” nas configurações). Dispare outro alerta pelo ERP e aguarde na bandeja — **sem abrir o app**.

> **Como funciona agora:** a API envia FCM **híbrido** (`notification` + `data`). Com o app fechado, o **próprio Android** exibe a notificação na bandeja (com som), usando o canal `portal_alerts_v2`. Com o app aberto, o `PortalMessagingService` exibe localmente. **Redeploy obrigatório na Vercel** após mudanças na API.

6. Deve chegar notificação na **bandeja** com **som** (canal “Alertas do portal”).

### Se ainda não tocar com app fechado

1. **Redeploy da API** — sem isso nada muda em produção.
2. **Reinstale o APK novo** (canal de notificação mudou para `portal_alerts_v2`).
3. Abra o app, faça login, aceite notificações.
4. Configurações do Android → Apps → Portal do Cliente → Notificações → canal **Alertas do portal** → Som **ativado**.
5. **Samsung / Xiaomi / Motorola:** Configurações → Bateria → desative economia de energia para este app (ou “Sem restrições”).
6. Não use **Forçar parada** do app — isso bloqueia FCM até abrir de novo.

---

## Checklist final

| # | Item | Status |
|---|------|--------|
| 1 | `google-services.json` em `app/` | |
| 2 | `package_name` correto | |
| 3 | Conta de serviço baixada (Admin SDK) | |
| 4 | `FIREBASE_SERVICE_ACCOUNT` na Vercel | |
| 5 | Redeploy da API | |
| 6 | `env-check` → `firebaseFcm: true` | |
| 7 | APK instalado + login + permissão | |
| 8 | Teste mudando OS no ERP | |

## Troubleshooting

- **Só funciona com app aberto:** era o *polling* (a cada ~20s), não FCM. Faça redeploy da API + APK novo.
- **Inbox no app OK, bandeja vazia:** API sem `FIREBASE_SERVICE_ACCOUNT`, permissão negada, ou token FCM inválido.
- **Aparece mas sem som:** verifique canal `portal_alerts_v2` nas configurações do app e modo Não Perturbe.
- **env-check ok, sem push:** login + permissão + token — Logcat `PortalFcmManager` / `PortalMessagingService`.
- **Projetos diferentes:** app e API no mesmo Firebase (`oficina-do-beto-campinas`).
