# Debug do App Colaborador pelo terminal (Cursor / PowerShell)
# Uso:
#   .\scripts\debug.ps1 build          # compila APK debug
#   .\scripts\debug.ps1 install        # instala no celular/emulador
#   .\scripts\debug.ps1 run            # abre o app
#   .\scripts\debug.ps1 log            # logs HTTP + erros
#   .\scripts\debug.ps1 all            # build + install + run + log

param(
    [Parameter(Position = 0)]
    [ValidateSet("build", "install", "run", "log", "all")]
    [string]$Action = "all"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Apk = Join-Path $Root "app\build\outputs\apk\debug\app-debug.apk"
$Package = "com.aistudio.betomecanica.colab"
$Activity = "com.example/.MainActivity"

if (-not $env:JAVA_HOME) {
    $studioJbr = "C:\Program Files\Android\Android Studio\jbr"
    if (Test-Path $studioJbr) { $env:JAVA_HOME = $studioJbr }
}

$adb = Join-Path $env:LOCALAPPDATA "Android\Sdk\platform-tools\adb.exe"
if (-not (Test-Path $adb)) {
    Write-Host "adb nao encontrado. Instale Android SDK Platform-Tools." -ForegroundColor Red
    exit 1
}

function Ensure-Device {
    $devices = & $adb devices | Select-String "device$" | Where-Object { $_ -notmatch "List of devices" }
    if (-not $devices) {
        Write-Host ""
        Write-Host "Nenhum dispositivo conectado." -ForegroundColor Yellow
        Write-Host "  Celular: ative Depuracao USB e conecte o cabo"
        Write-Host "  Emulador: abra um AVD ou rode: emulator -avd NOME_DO_AVD"
        Write-Host ""
        & $adb devices
        exit 1
    }
}

function Do-Build {
    Write-Host ">> Compilando APK debug..." -ForegroundColor Cyan
    Push-Location $Root
    try {
        & "$Root\gradlew.bat" assembleDebug
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
        Write-Host ">> APK: $Apk" -ForegroundColor Green
    } finally {
        Pop-Location
    }
}

function Do-Install {
    Ensure-Device
    if (-not (Test-Path $Apk)) {
        Write-Host "APK nao encontrado. Rode: .\scripts\debug.ps1 build" -ForegroundColor Red
        exit 1
    }
    Write-Host ">> Instalando no dispositivo..." -ForegroundColor Cyan
    & $adb install -r $Apk
}

function Do-Run {
    Ensure-Device
    Write-Host ">> Abrindo app..." -ForegroundColor Cyan
    & $adb shell am start -n "$Package/$Activity"
}

function Do-Log {
    Ensure-Device
    Write-Host ">> Logs (Ctrl+C para parar). Filtro: OkHttp + erros Android" -ForegroundColor Cyan
    & $adb logcat -c
    & $adb logcat OkHttp:I AndroidRuntime:E System.err:W *:S
}

switch ($Action) {
    "build"   { Do-Build }
    "install" { Do-Install }
    "run"     { Do-Run }
    "log"     { Do-Log }
    "all"     {
        Do-Build
        Do-Install
        Do-Run
        Do-Log
    }
}
