# Copia .env da raiz para packages/database, apps/api e mescla VITE_* em app/.env
$root = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path "$root\.env")) {
  Write-Error "Arquivo .env nao encontrado na raiz. Preencha a partir de .env.supabase.example"
  exit 1
}

Copy-Item "$root\.env" "$root\packages\database\.env" -Force
Copy-Item "$root\.env" "$root\apps\api\.env" -Force

$envContent = Get-Content "$root\.env" -Raw
$viteLines = @()
foreach ($line in ($envContent -split "`n")) {
  if ($line -match '^\s*VITE_') { $viteLines += $line.TrimEnd() }
}
if ($viteLines.Count -gt 0) {
  $appEnv = "$root\app\.env"
  $existing = @()
  if (Test-Path $appEnv) {
    $existing = Get-Content $appEnv | Where-Object { $_ -notmatch '^\s*VITE_' }
  }
  ($existing + $viteLines) | Set-Content $appEnv -Encoding utf8
}

Write-Host "OK: .env sincronizado para database, api e app (VITE_*)"
