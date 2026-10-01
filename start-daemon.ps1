# Start Antigravity Enhancements Daemon
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$vbsPath = Join-Path $scriptDir "anti-enhancements-daemon.vbs"
$pidFile = Join-Path $scriptDir "daemon.pid"

if (Test-Path $pidFile) {
    $existingPid = (Get-Content $pidFile -ErrorAction SilentlyContinue).Trim()
    if ($existingPid -and (Get-Process -Id $existingPid -ErrorAction SilentlyContinue)) {
        Write-Host "[✓] Antigravity Enhancements Daemon is already running (PID: $existingPid)." -ForegroundColor Green
        & (Join-Path $scriptDir "status.ps1")
        exit 0
    }
}

Write-Host "[*] Starting Antigravity Enhancements Daemon in background (Detached WMI)..." -ForegroundColor Cyan

$wmiSuccess = $false
try {
    $cmd = 'wscript.exe "{0}"' -f $vbsPath
    $res = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = $cmd } -ErrorAction Stop
    if ($res.ReturnValue -eq 0) {
        $wmiSuccess = $true
    }
} catch {}

if (-not $wmiSuccess) {
    Start-Process "wscript.exe" -ArgumentList "`"$vbsPath`""
}

Start-Sleep -Milliseconds 1200

if (Test-Path $pidFile) {
    $newPid = (Get-Content $pidFile -ErrorAction SilentlyContinue).Trim()
    Write-Host "[✓] Antigravity Enhancements Daemon started successfully (PID: $newPid)." -ForegroundColor Green
} else {
    Write-Host "[!] Daemon started, waiting for PID file..." -ForegroundColor Yellow
}

& (Join-Path $scriptDir "status.ps1")
