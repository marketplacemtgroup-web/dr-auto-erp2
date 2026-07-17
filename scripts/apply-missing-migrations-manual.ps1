# Aplica as 8 migrations que faltavam no Supabase (Oficina Scalibur)
# Uso recomendado (com .env configurado em packages/database/.env):
#   npm run db:deploy
#
# Alternativa manual via Prisma:
#   cd packages/database
#   npx prisma migrate deploy
#
# Alternativa SQL Editor do Supabase:
#   Cole o conteudo de scripts/apply-missing-migrations-manual.sql
#   Depois registre no _prisma_migrations (ver final do .sql)

$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

Write-Host "Verificando status..." -ForegroundColor Cyan
npm run db:deploy

Write-Host "`nConferindo..." -ForegroundColor Cyan
Push-Location packages/database
npx prisma migrate status
Pop-Location

Write-Host "`nPronto. Deve mostrar: Database schema is up to date!" -ForegroundColor Green
