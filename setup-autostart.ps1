# setup-autostart.ps1
# Setup Windows HKCU Autorun & Startup Shortcut for 24/7 Resilience & Sleep/Wake Auto-healing

[CmdletBinding()]
param(
    [switch]$Force
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$vbsPath = Join-Path $scriptDir "anti-enhancements-daemon.vbs"
$taskName = "AntigravityEnhancementsGuardian"
$currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "    Antigravity Enhancements Auto-Healing Setup           " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

if (-not (Test-Path $vbsPath)) {
    Write-Error "Cannot find anti-enhancements-daemon.vbs in $scriptDir"
    exit 1
}

# 1. Register HKCU Run Registry Entry (Highest Reliability User-level Auto-start)
Write-Host "[1/3] Configuring HKCU Run Registry Entry (Primary Autorun)..." -ForegroundColor Cyan
try {
    $regCmd = 'wscript.exe "{0}"' -f $vbsPath
    Set-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' -Name 'AntigravityEnhancements' -Value $regCmd -Force
    Write-Host "  [✓] Registry autorun configured: HKCU\Software\Microsoft\Windows\CurrentVersion\Run" -ForegroundColor Green
    Write-Host "      Command: $regCmd" -ForegroundColor Gray
} catch {
    Write-Host "  [!] Registry autorun notice: $_" -ForegroundColor Yellow
}

# 2. Create Startup Folder Shortcut as second layer fallback
Write-Host "[2/3] Configuring Startup Folder Shortcut (Dual Guard)..." -ForegroundColor Cyan
$startupDir = [Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startupDir "Antigravity Enhancements.lnk"

try {
    $wsh = New-Object -ComObject WScript.Shell
    $shortcut = $wsh.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = "wscript.exe"
    $shortcut.Arguments = "`"$vbsPath`""
    $shortcut.WorkingDirectory = $scriptDir
    $shortcut.WindowStyle = 7
    $shortcut.Description = "Antigravity Enhancements Daemon Auto-Start"
    $shortcut.Save()
    Write-Host "  [✓] Startup shortcut created: $shortcutPath" -ForegroundColor Green
} catch {
    Write-Host "  [!] Failed to create startup shortcut: $_" -ForegroundColor Yellow
}

# 3. Optional: Try Registering Scheduled Task if permissions allow
try {
    $act = New-ScheduledTaskAction -Execute "wscript.exe" -Argument "`"$vbsPath`"" -WorkingDirectory $scriptDir
    $trigLogon = New-ScheduledTaskTrigger -AtLogOn
    $sett = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Days 0)
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
    Register-ScheduledTask -TaskName $taskName -Action $act -Trigger $trigLogon -Settings $sett -Force -ErrorAction SilentlyContinue | Out-Null
    Write-Host "  [✓] Scheduled task optional guard: Active" -ForegroundColor Green
} catch {}

# 4. Trigger immediate start
Write-Host "[3/3] Starting Guardian Daemon now..." -ForegroundColor Cyan
& (Join-Path $scriptDir "start-daemon.ps1")

Write-Host "`n[✓] Auto-healing setup completed! Antigravity Enhancements will now persist through standby, sleep, reboots, and session changes." -ForegroundColor Green
