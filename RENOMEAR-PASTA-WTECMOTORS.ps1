# Renomeia a pasta do projeto para OFICINA-BETO (opcional).
# Uso: powershell -ExecutionPolicy Bypass -File ".\RENOMEAR-PASTA-WTECMOTORS.ps1"
# ou: powershell -ExecutionPolicy Bypass -File "e:\OFICINA BETO\oficina-beto\RENOMEAR-PASTA-WTECMOTORS.ps1"

$src = Split-Path -Parent $PSScriptRoot
if (-not $src) { $src = (Get-Location).Path }
$dst = 'e:\OFICINA BETO\oficina-beto'

if ($src -eq $dst) {
  Write-Host "A pasta já está em: $dst"
  exit 0
}

if (-not (Test-Path $src)) {
  Write-Host "Pasta de origem não encontrada: $src"
  exit 1
}

if (Test-Path $dst) {
  Write-Host "Destino já existe: $dst"
  exit 1
}

$parent = Split-Path -Parent $dst
if (-not (Test-Path $parent)) {
  New-Item -ItemType Directory -Path $parent -Force | Out-Null
}

Move-Item -Path $src -Destination $dst
Write-Host "Pronto! Pasta movida para $dst"
Write-Host 'Abra no Cursor: File > Open Folder > e:\OFICINA BETO\oficina-beto'
