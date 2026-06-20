# Debug do APK — APLICATIVO OFICINA

## Pré-requisitos

- Android Studio instalado
- SDK em `%LOCALAPPDATA%\Android\Sdk`
- Arquivo `local.properties` com:

```properties
sdk.dir=C\:\\Users\\SEU_USUARIO\\AppData\\Local\\Android\\Sdk
```

- Arquivo `.env` na raiz do app com `API_BASE_URL`

---

## Opção 1 — Android Studio (recomendado)

1. **File → Open** → pasta `APLICATIVO OFICINA`
2. Aguarde **Sync Gradle** terminar
3. Conecte o celular (USB + depuração USB) **ou** crie um emulador
4. Clique em **Run** (▶) ou `Shift+F10`
5. Para gerar APK: **Build → Build Bundle(s) / APK(s) → Build APK(s)**

APK gerado em:

```
APLICATIVO OFICINA/app/build/outputs/apk/debug/app-debug.apk
```

---

## Opção 2 — Linha de comando (PowerShell)

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
cd "E:\OFICINA BETO\oficina-beto\APLICATIVO OFICINA"
.\gradlew.bat assembleDebug
```

Ou use o script na raiz do monorepo:

```powershell
.\scripts\build-android.ps1
```

---

## Instalar APK no celular

```powershell
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
& $adb install -r "app\build\outputs\apk\debug\app-debug.apk"
```

---

## Depuração (Logcat)

No Android Studio: **View → Tool Windows → Logcat**

Filtros úteis:

| Filtro | Para ver |
|--------|----------|
| `package:br.com.oficinadobeto.app` | Só o app |
| `OkHttp` | Requisições HTTP |
| `level:error` | Erros |

### Problemas comuns

| Erro | Solução |
|------|---------|
| `Cleartext HTTP not permitted` | Já habilitado em dev; em produção use HTTPS |
| `Credenciais inválidas` | Confira login do ERP e `API_BASE_URL` no `.env` |
| `Unable to resolve host` | Celular sem internet ou URL errada |
| Emulador não acha API local | Use `http://10.0.2.2:3001/api/` |
| Celular físico não acha API local | Use IP da máquina na rede Wi‑Fi |
| `SDK location not found` | Crie/edite `local.properties` |

### Testar API no emulador

1. Na raiz do monorepo: `npm run dev` (API na porta 3001)
2. No `.env` do app:

```env
API_BASE_URL=http://10.0.2.2:3001/api/
```

3. Rebuild e reinstale o APK

### Testar API em produção

```env
API_BASE_URL=https://oficina-beto-api.vercel.app/api/
```

---

## Variáveis BuildConfig (via `.env`)

| Variável | Efeito |
|----------|--------|
| `API_BASE_URL` | URL base da API |
| `USE_MOCK_DATA=true` | Dados fake sem API (só testes) |

Após alterar `.env`: **Build → Rebuild Project**.
