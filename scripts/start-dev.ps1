$ErrorActionPreference = "Stop"

function Write-Section([string]$Message) {
  Write-Host ""
  Write-Host "== $Message =="
}

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

if (-not (Test-Path ".env")) {
  if (Test-Path ".env.example") {
    Write-Section "Creating .env from .env.example"
    Copy-Item ".env.example" ".env"
  } else {
    throw "Missing .env and .env.example. Create a .env file before starting."
  }
}

Write-Section "Starting PostgreSQL"
docker compose up -d

Write-Section "Waiting for PostgreSQL to be ready"
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
  try {
    docker compose exec -T postgres pg_isready -U trace -d trace | Out-Null
    $ready = $true
    break
  } catch {
    Start-Sleep -Seconds 1
  }
}

if (-not $ready) {
  throw "PostgreSQL did not become ready in time."
}

Write-Section "Generating Prisma Client"
npm run db:generate

Write-Section "Applying Prisma migrations"
npx prisma migrate deploy

Write-Section "Starting Next.js dev server"
npm run dev
