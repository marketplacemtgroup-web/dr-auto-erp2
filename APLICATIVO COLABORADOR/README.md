# App Colaborador — Oficina Beto

App Android para funcionários (ponto, escala, solicitações).

## Pré-requisitos

- [Android Studio](https://developer.android.com/studio) (Ladybug ou mais recente)
- JDK 17+ (incluso no Android Studio em `jbr`)
- Arquivo `.env` na pasta do projeto (copie de `.env.example`)

```env
API_BASE_URL=https://oficina-beto-api.vercel.app/api/
```

## Abrir no Android Studio

1. **File → Open** → selecione a pasta `APLICATIVO COLABORADOR`
2. Aguarde o Gradle Sync
3. Conecte um celular com **Depuração USB** ativa **ou** crie um emulador (API 34+)

## Debug (recomendado)

### Pelo Android Studio

1. Selecione o módulo **app** e a variante **debug**
2. Clique em **Run** (▶) ou `Shift+F10`
3. Abra **Logcat** (View → Tool Windows → Logcat)
4. Filtre por tag ou pacote: `com.aistudio.betomecanica.colab`

### Logs de rede (HTTP)

Em builds **debug**, o OkHttp registra todas as requisições no Logcat. Filtros úteis:

```
OkHttp
HttpClient
```

Você verá URL, headers, body da requisição e resposta — ideal para diagnosticar login, ponto e solicitações.

### Breakpoints

Coloque breakpoints em:

- `AuthService.login` — login
- `TimeClockService.punchClock` — bater ponto
- `AppViewModel.syncData` — sincronização após login

### Linha de comando (PowerShell)

```powershell
cd "E:\OFICINA BETO\oficina-beto\APLICATIVO COLABORADOR"
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
.\gradlew.bat assembleDebug
```

APK gerado em: `app\build\outputs\apk\debug\app-debug.apk`

Instalar no dispositivo conectado:

```powershell
adb install -r app\build\outputs\apk\debug\app-debug.apk
```

Ver logs em tempo real:

```powershell
adb logcat -s OkHttp:* AndroidRuntime:E
```

## Login de teste

Use um usuário **vinculado a um funcionário ativo** no ERP:

- Formato: `usuario@dominio-da-oficina`
- Permissões mínimas: `ponto.bater`, `escalas.ver`, `solicitacoes.criar`

## Problemas comuns

| Sintoma | Causa provável |
|---------|----------------|
| "Sem conexão" | Celular sem internet ou URL errada no `.env` |
| 401 / sessão expirada | Token inválido — faça logout e login de novo |
| 403 | Funcionário sem permissão ou sem vínculo `Employee.memberId` |
| Tela OS/Comissões vazia | Endpoints ainda não implementados na API (esperado) |

Após alterar `.env`, rode **Build → Rebuild Project**.
