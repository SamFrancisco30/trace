$ErrorActionPreference = "Stop"

function Write-Section([string]$Message) {
  Write-Host ""
  Write-Host "== $Message =="
}

function Get-ProcessSnapshot([int]$Pid) {
  $process = Get-CimInstance Win32_Process -Filter "ProcessId = $Pid" -ErrorAction SilentlyContinue
  if (-not $process) {
    return $null
  }

  return [pscustomobject]@{
    pid = [int]$process.ProcessId
    creationTimeUtc = ([DateTime]$process.CreationDate).ToUniversalTime().ToString("o")
    commandLine = [string]$process.CommandLine
  }
}

function Read-DevServerManifest([string]$Path) {
  if (-not (Test-Path $Path)) {
    return $null
  }

  $raw = Get-Content $Path -Raw

  try {
    return $raw | ConvertFrom-Json
  } catch {
    $trimmed = $raw.Trim()
    if ($trimmed -match '^\d+$') {
      return [pscustomobject]@{
        pid = [int]$trimmed
        creationTimeUtc = $null
        commandLine = $null
        legacy = $true
      }
    }

    return $null
  }
}

function Test-DevServerIdentity($Manifest, $Snapshot) {
  if (-not $Manifest -or -not $Snapshot) {
    return $false
  }

  if ($Manifest.legacy -eq $true) {
    return (
      $Snapshot.commandLine -match 'npm(\.cmd)?' -and
      $Snapshot.commandLine -match '\brun\b' -and
      $Snapshot.commandLine -match '\bdev\b'
    )
  }

  return (
    [int]$Manifest.pid -eq $Snapshot.pid -and
    [string]$Manifest.creationTimeUtc -eq $Snapshot.creationTimeUtc -and
    [string]$Manifest.commandLine -eq $Snapshot.commandLine
  )
}

function Stop-ProcessTree([int]$Pid) {
  $children = Get-CimInstance Win32_Process -Filter "ParentProcessId = $Pid" -ErrorAction SilentlyContinue
  foreach ($child in $children) {
    Stop-ProcessTree -Pid $child.ProcessId
  }

  Stop-Process -Id $Pid -Force -ErrorAction SilentlyContinue
}

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$devPidFile = Join-Path $repoRoot ".trace-dev.pid"
$devOutLogFile = Join-Path $repoRoot ".trace-dev.out.log"
$devErrLogFile = Join-Path $repoRoot ".trace-dev.err.log"
$existingDevManifest = Read-DevServerManifest -Path $devPidFile

if (-not (Test-Path ".env")) {
  if (Test-Path ".env.example") {
    Write-Section "Creating .env from .env.example"
    Copy-Item ".env.example" ".env"
  } else {
    throw "Missing .env and .env.example. Create a .env file before starting."
  }
}

if ($existingDevManifest) {
  $existingSnapshot = Get-ProcessSnapshot -Pid ([int]$existingDevManifest.pid)
  if (Test-DevServerIdentity -Manifest $existingDevManifest -Snapshot $existingSnapshot) {
    Write-Section "Stopping existing dev server"
    Stop-ProcessTree -Pid $existingSnapshot.pid
  } else {
    Write-Section "Removing stale dev server pid file"
  }
  Remove-Item $devPidFile -Force -ErrorAction SilentlyContinue
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
New-Item -ItemType File -Path $devOutLogFile -Force | Out-Null
New-Item -ItemType File -Path $devErrLogFile -Force | Out-Null
$devProcess = Start-Process -FilePath "npm.cmd" `
  -ArgumentList @("run", "dev") `
  -WorkingDirectory $repoRoot `
  -RedirectStandardOutput $devOutLogFile `
  -RedirectStandardError $devErrLogFile `
  -PassThru `
  -WindowStyle Hidden

$devSnapshot = Get-ProcessSnapshot -Pid $devProcess.Id
if (-not $devSnapshot) {
  throw "Failed to capture the dev server process details."
}

Set-Content -Path $devPidFile -Value ($devSnapshot | ConvertTo-Json -Compress)

Write-Section "Dev server started"
Write-Host "PID: $($devSnapshot.pid)"
Write-Host "Stdout: $devOutLogFile"
Write-Host "Stderr: $devErrLogFile"
Write-Host "Use .\scripts\stop-dev.ps1 to stop the app and database."
