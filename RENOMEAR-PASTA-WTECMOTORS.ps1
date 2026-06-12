# Feche o Cursor antes de executar este script.
# Clique com botao direito > Executar com PowerShell
# ou: powershell -ExecutionPolicy Bypass -File "e:\dr-auto-erp2\RENOMEAR-PASTA-WTECMOTORS.ps1"

$ErrorActionPreference = 'Stop'
$src = 'e:\dr-auto-erp2'
$dst = 'e:\WTECMOTORS'

if (Test-Path $dst) {
  Write-Host "A pasta $dst ja existe. Nada a fazer."
  exit 0
}

if (-not (Test-Path $src)) {
  Write-Host "Pasta $src nao encontrada."
  exit 1
}

Write-Host 'Encerrando processos Node do projeto...'
Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -match 'dr-auto-erp2' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

Start-Sleep -Seconds 2

Write-Host "Renomeando $src -> $dst ..."
Rename-Item -Path $src -NewName 'WTECMOTORS'

Write-Host ''
Write-Host 'Pronto! Pasta renomeada para e:\WTECMOTORS'
Write-Host 'Abra no Cursor: File > Open Folder > e:\WTECMOTORS'
