# Copia DATABASE_URL e DIRECT_URL sem aspas para o clipboard (Vercel).
$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root ".env"
if (-not (Test-Path $envFile)) {
  Write-Error ".env nao encontrado na raiz"
  exit 1
}

function Get-CleanUrl($name) {
  $line = Get-Content $envFile | Where-Object { $_ -match "^$name=" } | Select-Object -First 1
  if (-not $line) { return $null }
  return ($line -replace "^$name=", "" -replace '^"|"$', "").Trim()
}

$db = Get-CleanUrl "DATABASE_URL"
$direct = Get-CleanUrl "DIRECT_URL"

if (-not $db -or -not $direct) {
  Write-Error "DATABASE_URL ou DIRECT_URL ausente no .env"
  exit 1
}

Write-Host "DATABASE_URL host:" -NoNewline
if ($db -match '@([^:/]+):(\d+)') { Write-Host " $($matches[1]):$($matches[2])" }
Write-Host ""
Write-Host "1) Cole DATABASE_URL na Vercel (sem aspas) — Enter para copiar..."
Read-Host | Out-Null
$db | Set-Clipboard
Write-Host "   DATABASE_URL copiada."
Write-Host ""
Write-Host "2) Cole DIRECT_URL na Vercel (sem aspas) — Enter para copiar..."
Read-Host | Out-Null
$direct | Set-Clipboard
Write-Host "   DIRECT_URL copiada."
Write-Host ""
Write-Host "Vercel -> oficinadobeto-api -> Settings -> Environment Variables"
Write-Host "Apague e recrie as duas vars, SINGLE_TENANT=true, depois Redeploy."
