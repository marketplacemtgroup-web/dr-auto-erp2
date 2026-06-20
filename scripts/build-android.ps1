# Build APK debug do app Android
param(
    [string]$ProjectDir = "$PSScriptRoot\..\APLICATIVO OFICINA"
)

$javaHome = "C:\Program Files\Android\Android Studio\jbr"
if (Test-Path $javaHome) {
    $env:JAVA_HOME = $javaHome
    $env:PATH = "$javaHome\bin;$env:PATH"
}

Push-Location $ProjectDir
try {
    if (-not (Test-Path ".\gradlew.bat")) {
        Write-Error "gradlew.bat não encontrado. Abra o projeto no Android Studio uma vez para gerar o wrapper."
        exit 1
    }

    if (-not (Test-Path ".\local.properties")) {
        $sdk = "$env:LOCALAPPDATA\Android\Sdk"
        if (Test-Path $sdk) {
            "sdk.dir=$($sdk -replace '\\','\\')" | Set-Content -Path ".\local.properties" -Encoding UTF8
            Write-Host "Criado local.properties com SDK: $sdk"
        } else {
            Write-Warning "SDK não encontrado. Instale Android Studio ou crie local.properties manualmente."
        }
    }

    .\gradlew.bat assembleDebug --no-daemon
    if ($LASTEXITCODE -eq 0) {
        $apk = Resolve-Path ".\app\build\outputs\apk\debug\app-debug.apk"
        Write-Host ""
        Write-Host "APK gerado com sucesso:" -ForegroundColor Green
        Write-Host $apk
    }
} finally {
    Pop-Location
}
