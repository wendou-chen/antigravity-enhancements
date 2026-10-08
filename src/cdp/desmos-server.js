const http = require('http');
const fs = require('fs');
const path = require('path');

const DEFAULT_PORT = 8325;
const ASSET_PATH = path.resolve(__dirname, '..', 'assets', 'desmos_api.js');

class DesmosServer {
  constructor(injector, logFn, port = DEFAULT_PORT) {
    this.injector = injector || null;
    this.log = logFn || console.log;
    this.port = port;
    this.server = null;
    this.isRunning = false;

    // 缓存最新数学画板状态
    this.currentPlotState = {
      version: 1,
      dimension: '2d',
      action: 'plot',
      expressions: [
        { id: 'expr_init_1', latex: 'y=\\sin(x)', color: '#2563eb', lineWidth: 3.5 }
      ],
      bounds: null,
      timestamp: Date.now()
    };
  }

  start() {
    if (this.isRunning) return;

    this.server = http.createServer((req, res) => {
      this.handleRequest(req, res);
    });

    this.server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        this.log(`[DesmosServer] Port ${this.port} is already in use, assuming active DesmosServer instance.`);
      } else {
        this.log(`[DesmosServer] Server error: ${err.message}`);
      }
    });

    this.server.listen(this.port, '127.0.0.1', () => {
      this.isRunning = true;
      this.log(`[DesmosServer] Desmos API & Plot Server listening on http://127.0.0.1:${this.port}`);
    });
  }

  stop() {
    if (this.server) {
      try {
        if (this.isRunning) {
          this.server.close();
        }
      } catch {}
      this.server = null;
    }
    this.isRunning = false;
    this.log('[DesmosServer] Server stopped.');
  }

  async handleRequest(req, res) {
    // 允许任意跨域 (反重力宿主 webview 与脚本直连)
    const setCorsHeaders = () => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    };

    setCorsHeaders();

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = req.url || '';

    // 1. 离线 Desmos 脚本托管 (GET /assets/desmos_api.js)
    if (url.startsWith('/assets/desmos_api.js') && req.method === 'GET') {
      if (fs.existsSync(ASSET_PATH)) {
        try {
          const content = fs.readFileSync(ASSET_PATH);
          res.writeHead(200, {
            'Content-Type': 'application/javascript; charset=utf-8',
            'Content-Length': content.length,
            'Cache-Control': 'public, max-age=86400'
          });
          res.end(content);
          return;
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end(`Error reading asset: ${err.message}`);
          return;
        }
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('desmos_api.js not found');
        return;
      }
    }

    // 2. 健康检查与状态 (GET /api/state 或 GET /health)
    if ((url.startsWith('/api/state') || url === '/health' || url === '/api/health') && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        status: 'ok',
        version: '2.9.0',
        port: this.port,
        state: this.currentPlotState
      }));
      return;
    }

    // 3. 0ms 零延迟 CDP 推送与绘图命令 (POST /api/plot)
    if (url.startsWith('/api/plot') && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const parsed = JSON.parse(body || '{}');
          const rawExprs = parsed.expressions || [];

          const is3D = (item) => {
            if (!item) return false;
            const str = typeof item === 'object' && item !== null ? (item.latex || item.expr || '') : String(item);
            const s = str.replace(/\s+/g, '');
            if (/\([a-zA-Z0-9+\-*/.]+,[a-zA-Z0-9+\-*/.]+,[a-zA-Z0-9+\-*/.]+\)/.test(s)) return true;
            if (/(?:^|[^a-zA-Z\\])[zZ](?:[^a-zA-Z]|$)/.test(s)) return true;
            return false;
          };

          let targetDim = parsed.dimension || 'auto';
          if (targetDim === 'auto') {
            const has3D = rawExprs.some(is3D);
            targetDim = has3D ? '3d' : '2d';
          }

          const action = parsed.action || 'plot';
          let updatedExpressions = [];
          if (action === 'clear') {
            updatedExpressions = [];
          } else if (action === 'setDimension') {
            updatedExpressions = this.currentPlotState.expressions;
          } else if (action === 'append') {
            updatedExpressions = [...this.currentPlotState.expressions, ...rawExprs];
          } else {
            updatedExpressions = rawExprs;
          }

          this.currentPlotState = {
            version: this.currentPlotState.version + 1,
            dimension: targetDim,
            action: action,
            expressions: updatedExpressions,
            bounds: parsed.bounds || null,
            timestamp: Date.now()
          };

          // 核心：0ms 零延迟 CDP 推送至 Antigravity 宿主 Web DOM
          const payload = {
            version: this.currentPlotState.version,
            dimension: targetDim,
            action: action,
            expressions: rawExprs,
            bounds: parsed.bounds || null
          };

          let cdpPushed = false;
          if (this.injector && typeof this.injector.evaluateInActiveTarget === 'function') {
            try {
              cdpPushed = await this.pushPlotToCDP(payload);
            } catch (cdpErr) {
              this.log(`[DesmosServer] CDP Push Warning: ${cdpErr.message}`);
            }
          }

          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({
            success: true,
            version: this.currentPlotState.version,
            dimension: targetDim,
            expressions: updatedExpressions,
            cdpPushed
          }));
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
      });
      return;
    }

    // 默认 404
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
  }

  async pushPlotToCDP(payload) {
    if (!this.injector || typeof this.injector.evaluateInActiveTarget !== 'function') {
      return false;
    }
    const script = `(function() {
      if (typeof window !== 'undefined' && window.__ANTI_DESMOS__) {
        window.__ANTI_DESMOS__.handlePlotPayload(${JSON.stringify(payload)});
        return true;
      }
      return false;
    })()`;
    const result = await this.injector.evaluateInActiveTarget(script);
    return result === true;
  }
}

module.exports = { DesmosServer, DEFAULT_PORT };
