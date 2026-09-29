# Stop Antigravity Enhancements Daemon
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$pidFile = Join-Path $scriptDir "daemon.pid"

$stopped = $false

if (Test-Path $pidFile) {
    $existingPid = (Get-Content $pidFile -ErrorAction SilentlyContinue).Trim()
    if ($existingPid -and (Get-Process -Id $existingPid -ErrorAction SilentlyContinue)) {
        Stop-Process -Id $existingPid -Force -ErrorAction SilentlyContinue
        Write-Host "[✓] Killed Daemon process PID: $existingPid" -ForegroundColor Green
        $stopped = $true
    }
    Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
}

# Also kill any node processes running daemon.js
$daemonProcs = Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like "*antigravity-enhancements*daemon.js*" }
foreach ($p in $daemonProcs) {
    Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
    Write-Host "[✓] Terminated node daemon PID: $($p.ProcessId)" -ForegroundColor Green
    $stopped = $true
}

if (-not $stopped) {
    Write-Host "[i] No running Antigravity Enhancements Daemon found." -ForegroundColor Yellow
} else {
    Write-Host "[✓] Daemon stopped cleanly." -ForegroundColor Green
}
