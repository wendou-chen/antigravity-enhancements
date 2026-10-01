# uninstall-autostart.ps1
# Remove Windows HKCU Autorun, Scheduled Task & Startup Shortcut for Antigravity Enhancements

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$taskName = "AntigravityEnhancementsGuardian"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "    Antigravity Enhancements Auto-Healing Uninstall       " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Stop Daemon
& (Join-Path $scriptDir "stop-daemon.ps1")

# 2. Delete Registry Autorun
Write-Host "[*] Removing HKCU Run Registry Entry..." -ForegroundColor Cyan
try {
    Remove-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' -Name 'AntigravityEnhancements' -ErrorAction SilentlyContinue
    Write-Host "  [✓] Registry autorun removed." -ForegroundColor Green
} catch {
    Write-Host "  [!] Registry notice: $_" -ForegroundColor Yellow
}

# 3. Remove Startup Shortcut
Write-Host "[*] Removing Startup Shortcut..." -ForegroundColor Cyan
$startupDir = [Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startupDir "Antigravity Enhancements.lnk"
if (Test-Path $shortcutPath) {
    Remove-Item $shortcutPath -Force -ErrorAction SilentlyContinue
    Write-Host "  [✓] Startup shortcut removed." -ForegroundColor Green
}

# 4. Delete Scheduled Task if present
Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue

Write-Host "`n[✓] All auto-start and guardian tasks have been successfully uninstalled." -ForegroundColor Green
