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
$devManifest = Read-DevServerManifest -Path $devPidFile

Write-Section "Stopping Next.js dev server"
if ($devManifest) {
  $snapshot = Get-ProcessSnapshot -Pid ([int]$devManifest.pid)
  if (Test-DevServerIdentity -Manifest $devManifest -Snapshot $snapshot) {
    Stop-ProcessTree -Pid $snapshot.pid
    Write-Host "Stopped dev server PID $($snapshot.pid)"
  } else {
    Write-Host "Dev server pid file was stale or belonged to another process"
  }
  Remove-Item $devPidFile -Force -ErrorAction SilentlyContinue
} else {
  Write-Host "No dev server pid file found"
}

Write-Section "Stopping PostgreSQL"
docker compose down
