# Feche o Cursor antes de executar este script.
# Clique com botao direito > Executar com PowerShell
# ou: powershell -ExecutionPolicy Bypass -File "e:\OFICINA BETO\dr-auto-erp2\RENOMEAR-PASTA-OFICINA-DO-BETO.ps1"

$ErrorActionPreference = 'Stop'
$src = 'e:\dr-auto-erp2'
$dst = 'e:\OFICINA DO BETO'

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
Rename-Item -Path $src -NewName 'OFICINA DO BETO'

Write-Host ''
Write-Host 'Pronto! Pasta renomeada para e:\OFICINA DO BETO'
Write-Host 'Abra no Cursor: File > Open Folder > e:\OFICINA DO BETO'
