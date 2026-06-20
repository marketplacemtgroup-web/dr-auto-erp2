# APLICATIVO OFICINA — OFICINA DO BETO

App Android nativo (Kotlin + Jetpack Compose) para a equipe da oficina: dashboard, OS, checklist fotográfico e orçamento.

## Pré-requisitos

- [Android Studio](https://developer.android.com/studio) (Ladybug ou mais recente)
- API do monorepo rodando (`npm run dev` na raiz) **ou** URL de produção na Vercel

## Configuração

1. Abra a pasta `APLICATIVO OFICINA` no Android Studio.
2. Copie `.env.example` para `.env` e ajuste:

```env
API_BASE_URL=https://oficina-beto-api.vercel.app/api/
USE_MOCK_DATA=false
```

**Emulador + API local:**

```env
API_BASE_URL=http://10.0.2.2:3001/api/
```

**Dispositivo físico na mesma rede:**

```env
API_BASE_URL=http://SEU_IP_LOCAL:3001/api/
```

3. Sync Gradle e execute no emulador ou celular.

## Login

Use o mesmo e-mail e senha do ERP (`app/`). Perfis recomendados: `mecanico`, `recepcao`, `gerente`.

## Integração com a API

O app consome os mesmos endpoints do ERP:

- `POST /api/auth/login`
- `GET /api/service-orders`
- `PATCH /api/service-orders/:id/checklist`
- `POST /api/quotes` + `POST /api/quotes/:id/share-link`
- Upload de fotos via `attachments/service-order/:id/prepare-upload`

Documentação completa: `docs/APLICATIVO-OFICINA.md`  
**Debug e build APK:** `docs/APLICATIVO-OFICINA-DEBUG.md`

## Build APK debug

```bash
cd "APLICATIVO OFICINA"
./gradlew assembleDebug
```

APK em `app/build/outputs/apk/debug/`.
