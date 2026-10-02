param(
    [Alias("t")]
    [switch]$Test
)

# Check Antigravity Enhancements Status
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

if ($Test) {
    $smokeScript = Join-Path $scriptDir "tests\smoke_test.js"
    if (Test-Path $smokeScript) {
        & node $smokeScript
        exit $LASTEXITCODE
    }
}
$pidFile = Join-Path $scriptDir "daemon.pid"
$logFile = Join-Path $scriptDir "daemon.log"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "       Antigravity Enhancements Lifecycle Status          " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Daemon Process
$isDaemonRunning = $false
if (Test-Path $pidFile) {
    $dPid = (Get-Content $pidFile -ErrorAction SilentlyContinue).Trim()
    $proc = Get-Process -Id $dPid -ErrorAction SilentlyContinue
    if ($proc) {
        Write-Host "  Daemon Status     : RUNNING (PID: $dPid, Memory: $([math]::Round($proc.WorkingSet64 / 1MB, 1)) MB)" -ForegroundColor Green
        $isDaemonRunning = $true
    }
}
if (-not $isDaemonRunning) {
    Write-Host "  Daemon Status     : STOPPED" -ForegroundColor Red
}

# 2. Antigravity Process & DevTools Port
$antiProc = Get-Process -Name "Antigravity" -ErrorAction SilentlyContinue | Select-Object -First 1
$activePortFile = "$env:APPDATA\Antigravity\DevToolsActivePort"
if ($antiProc) {
    Write-Host "  Antigravity PID   : $($antiProc.Id) (Active)" -ForegroundColor Green
} else {
    Write-Host "  Antigravity PID   : Not Running" -ForegroundColor Yellow
}

$port = $null
if (Test-Path $activePortFile) {
    $lines = Get-Content $activePortFile -ErrorAction SilentlyContinue
    if ($lines.Count -ge 1) {
        $port = $lines[0].Trim()
        Write-Host "  DevTools CDP Port : $port" -ForegroundColor Green
    }
}
if (-not $port) {
    Write-Host "  DevTools CDP Port : Not Found" -ForegroundColor Yellow
}

$probePort = if ($port) { $port } else { 0 }
$probeScript = @"
const http = require('http');
const WebSocket = require('$($scriptDir.Replace('\', '/'))/node_modules/ws');

http.get({ hostname: '127.0.0.1', port: $probePort, path: '/json', timeout: 1000 }, (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    try {
      const targets = JSON.parse(data);
      const target = targets.find(t => t.type === 'page' || t.type === 'webview');
      if (!target) return console.log('NO_PAGE');
      const ws = new WebSocket(target.webSocketDebuggerUrl);
      ws.on('open', () => {
        ws.send(JSON.stringify({
          id: 1,
          method: 'Runtime.evaluate',
          params: { expression: '({ fab: Boolean(document.querySelector(\".anti-fab-container\")), style: Boolean(document.getElementById(\"anti-enhancements-style\")), width: window.getComputedStyle(document.documentElement).getPropertyValue(\"--anti-chat-max-width\") })', returnByValue: true }
        }));
      });
      ws.on('message', m => {
        const val = JSON.parse(m.toString()).result?.result?.value;
        console.log('DOM_PROBE:' + JSON.stringify(val));
        ws.close();
      });
      ws.on('error', () => console.log('WS_ERR'));
    } catch {
      console.log('PARSE_ERR');
    }
  });
}).on('error', () => console.log('HTTP_ERR'));
"@

if ($port) {
    $tempProbe = [System.IO.Path]::GetTempFileName() + ".js"
    [System.IO.File]::WriteAllText($tempProbe, $probeScript, [System.Text.Encoding]::UTF8)
    $probeOut = & node $tempProbe 2>&1
    Remove-Item $tempProbe -Force -ErrorAction SilentlyContinue

    if ($probeOut -match "DOM_PROBE:(.+)") {
        $json = $matches[1]
        Write-Host "  Live DOM Injection: $json" -ForegroundColor Green
    } else {
        Write-Host "  Live DOM Injection: Pending / Not Connected ($probeOut)" -ForegroundColor Yellow
    }
}

# 4. Auto-healing & Persistence Status
$regVal = Get-ItemPropertyValue -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' -Name 'AntigravityEnhancements' -ErrorAction SilentlyContinue
if ($regVal) {
    Write-Host "  HKCU Autorun Reg  : ENABLED (Logon & Reboot Guard)" -ForegroundColor Green
} else {
    Write-Host "  HKCU Autorun Reg  : NOT CONFIGURED" -ForegroundColor Yellow
}

$startupShortcut = Join-Path ([Environment]::GetFolderPath('Startup')) "Antigravity Enhancements.lnk"
if (Test-Path $startupShortcut) {
    Write-Host "  Startup Shortcut  : ENABLED (Startup Folder Fallback)" -ForegroundColor Green
} else {
    Write-Host "  Startup Shortcut  : NOT FOUND" -ForegroundColor Yellow
}

# 5. Recent Log Lines
if (Test-Path $logFile) {
    Write-Host "`n--- Recent Daemon Logs ---" -ForegroundColor DarkGray
    Get-Content $logFile -Tail 5 -ErrorAction SilentlyContinue | ForEach-Object {
        Write-Host "  $_" -ForegroundColor DarkGray
    }
}
Write-Host "==========================================================" -ForegroundColor Cyan
