const path = require('path');
const fs = require('fs');
const { CDPInjector } = require('./cdp/injector');
const { DesmosServer } = require('./cdp/desmos-server');

const ROOT_DIR = path.resolve(__dirname, '..');
const LOG_FILE = path.join(ROOT_DIR, 'daemon.log');
const PID_FILE = path.join(ROOT_DIR, 'daemon.pid');

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try {
    fs.appendFileSync(LOG_FILE, line, 'utf-8');
  } catch {}
  try {
    console.log(msg);
  } catch {}
}

// 1. Single Instance Check
function checkSingleInstance() {
  if (fs.existsSync(PID_FILE)) {
    try {
      const oldPid = parseInt(fs.readFileSync(PID_FILE, 'utf-8').trim(), 10);
      if (oldPid && oldPid !== process.pid) {
        try {
          // Check if old process is still alive
          process.kill(oldPid, 0);
          console.log(`[Daemon] Antigravity Enhancements Daemon is already running (PID: ${oldPid}). Exiting.`);
          process.exit(0);
        } catch {
          // Stale PID file
        }
      }
    } catch {}
  }
  fs.writeFileSync(PID_FILE, String(process.pid), 'utf-8');
}

checkSingleInstance();

log(`[Daemon] ========================================`);
log(`[Daemon] Antigravity Enhancements Daemon started (PID: ${process.pid})`);
log(`[Daemon] Watching Antigravity DevToolsActivePort for auto-injection...`);

const injector = new CDPInjector(log);
injector.start();

const desmosServer = new DesmosServer(injector, log);
desmosServer.start();

// 2. Active Heartbeat Watchdog: keeps event loop alive & recovers loop if frozen
const heartbeatInterval = setInterval(() => {
  try {
    injector.checkHealthAndRecover();
  } catch (err) {
    log(`[Daemon] Watchdog check error: ${err.message}`);
  }
}, 5000);

function cleanup() {
  log('[Daemon] Shutting down daemon...');
  clearInterval(heartbeatInterval);
  desmosServer.stop();
  injector.stop();
  try {
    if (fs.existsSync(PID_FILE)) {
      fs.unlinkSync(PID_FILE);
    }
  } catch {}
  process.exit(0);
}

process.on('SIGINT', () => {
  log('[Daemon] Received SIGINT');
  cleanup();
});
process.on('SIGTERM', () => {
  log('[Daemon] Received SIGTERM');
  cleanup();
});
process.on('beforeExit', (code) => {
  log(`[Daemon] Process beforeExit event triggered (event loop empty) with code: ${code}`);
});
process.on('exit', (code) => {
  log(`[Daemon] Process exit event triggered with code: ${code}`);
  try {
    if (fs.existsSync(PID_FILE)) {
      fs.unlinkSync(PID_FILE);
    }
  } catch {}
});

process.on('uncaughtException', (err) => {
  log(`[Daemon] Uncaught Exception: ${err.stack || err.message}`);
});

process.on('unhandledRejection', (reason) => {
  log(`[Daemon] Unhandled Rejection: ${reason && (reason.stack || reason.message || reason)}`);
});
