# Atalho na raiz do monorepo — debug sem instalar.
param(
    [switch]$Test,
    [switch]$Clean,
    [switch]$Mock
)

$debugScript = Join-Path $PSScriptRoot "..\APLICATIVO OFICINA\debug.ps1"
& $debugScript @PSBoundParameters
exit $LASTEXITCODE
