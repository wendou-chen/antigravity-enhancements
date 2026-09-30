const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { getClientInjectionScript } = require('./client-assets');

let WebSocketClient = null;
try {
  WebSocketClient = require('ws');
} catch (e) {
  try {
    const fallbackWs = path.join(
      os.homedir(),
      '.antigravity',
      'extensions',
      'yazanbaker.antigravity-autoaccept-3.27.18-universal',
      'node_modules',
      'ws'
    );
    if (fs.existsSync(fallbackWs)) {
      WebSocketClient = require(fallbackWs);
    }
  } catch {}
}

if (!WebSocketClient && typeof WebSocket !== 'undefined') {
  WebSocketClient = WebSocket;
}

class CDPInjector {
  constructor(logFn) {
    this.log = logFn || console.log;
    this.isRunning = false;
    this.pollTimer = null;
    this.activePort = null;
    this.injectingTargets = new Set();
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.log('[CDP] Starting Antigravity Web Enhancements Injector...');
    this.loop();
  }

  stop() {
    this.isRunning = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
    this.log('[CDP] Stopped Injector.');
  }

  async loop() {
    if (!this.isRunning) return;
    try {
      await this.scanAndInject();
    } catch (err) {
      this.log(`[CDP] Loop error: ${err.message}`);
    } finally {
      if (this.isRunning) {
        this.pollTimer = setTimeout(() => this.loop(), 1500);
      }
    }
  }

  async findActivePort() {
    const activePortFile = path.join(
      os.homedir(),
      'AppData',
      'Roaming',
      'Antigravity',
      'DevToolsActivePort'
    );
    if (fs.existsSync(activePortFile)) {
      try {
        const content = fs.readFileSync(activePortFile, 'utf-8');
        const firstLine = content.split('\n')[0].trim();
        const port = parseInt(firstLine, 10);
        if (port > 0 && (await this.pingPort(port))) {
          this.activePort = port;
          return port;
        }
      } catch {}
    }

    for (const port of [55013, 63523, 9333, 9334, 9222]) {
      if (await this.pingPort(port)) {
        this.activePort = port;
        return port;
      }
    }

    return null;
  }

  pingPort(port) {
    return new Promise((resolve) => {
      const req = http.get(
        { hostname: '127.0.0.1', port, path: '/json/version', timeout: 600 },
        (res) => {
          res.on('data', () => {});
          res.on('end', () => resolve(true));
        }
      );
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
    });
  }

  getTargets(port) {
    return new Promise((resolve) => {
      const req = http.get(
        { hostname: '127.0.0.1', port, path: '/json', timeout: 1200 },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch {
              resolve([]);
            }
          });
        }
      );
      req.on('error', () => resolve([]));
      req.on('timeout', () => {
        req.destroy();
        resolve([]);
      });
    });
  }

  async scanAndInject() {
    const port = await this.findActivePort();
    if (!port) return;

    const targets = await this.getTargets(port);
    if (!Array.isArray(targets) || targets.length === 0) return;

    const tasks = [];
    for (const target of targets) {
      if (!target.webSocketDebuggerUrl) continue;
      const isPage = target.type === 'page' || target.type === 'webview';
      if (!isPage) continue;

      if (this.injectingTargets.has(target.id)) continue;

      this.injectingTargets.add(target.id);
      const p = this.checkAndInjectTarget(target).finally(() => {
        this.injectingTargets.delete(target.id);
      });
      tasks.push(p);
    }

    await Promise.all(tasks);
  }

  checkAndInjectTarget(target) {
    return new Promise((resolve) => {
      if (!WebSocketClient) {
        this.log('[CDP] WebSocket client missing');
        return resolve(false);
      }

      const wsUrl = target.webSocketDebuggerUrl;
      let ws;
      try {
        ws = new WebSocketClient(wsUrl);
      } catch (e) {
        this.log(`[CDP] WS connect failed: ${e.message}`);
        return resolve(false);
      }

      let timeout = setTimeout(() => {
        try { ws.close(); } catch {}
        resolve(false);
      }, 4000);

      const checkScript = `Boolean(document.getElementById('anti-enhancements-style') && document.getElementById('anti-enhancements-style').getAttribute('data-version') === '2.1.0' && document.querySelector('.anti-fab-container'))`;

      ws.on('open', () => {
        ws.send(JSON.stringify({
          id: 1,
          method: 'Runtime.evaluate',
          params: { expression: checkScript, returnByValue: true }
        }));
      });

      ws.on('message', (data) => {
        try {
          const res = JSON.parse(data.toString());
          if (res.id === 1) {
            const isAlreadyLoaded = res.result && res.result.result && res.result.result.value === true;
            if (!isAlreadyLoaded) {
              this.log(`[CDP] Injecting into: ${target.title || target.id}`);
              const injectScript = getClientInjectionScript();
              ws.send(JSON.stringify({
                id: 2,
                method: 'Runtime.evaluate',
                params: {
                  expression: injectScript,
                  userGesture: true,
                  awaitPromise: true,
                  returnByValue: true
                }
              }));
            } else {
              clearTimeout(timeout);
              try { ws.close(); } catch {}
              resolve(true);
            }
          } else if (res.id === 2) {
            this.log(`[CDP] Injection success: ${target.title || target.id}`);
            clearTimeout(timeout);
            try { ws.close(); } catch {}
            resolve(true);
          }
        } catch (e) {
          clearTimeout(timeout);
          try { ws.close(); } catch {}
          resolve(false);
        }
      });

      ws.on('error', (err) => {
        clearTimeout(timeout);
        try { ws.close(); } catch {}
        resolve(false);
      });
    });
  }

  async forceReinject() {
    await this.scanAndInject();
  }
}

module.exports = { CDPInjector };