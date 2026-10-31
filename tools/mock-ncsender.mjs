// Mock ncSender for the dialog (implementation plan P4.12). Adapted from
// ncCAM's dev/serve.mjs. The store is in memory only.
// Usage: npm run mock [-- <port> [metric|imperial]]     then open http://localhost:8777/
import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '../..');
const PLUGIN_DIR = join(ROOT, 'com.infield.chessset');
const ID = 'com.infield.chessset';

export function startMock({ port = 8777, quiet = false, units = 'metric' } = {}) {
  const store = new Map(); // path → {content} or {size} for .stl
  let settings = null; // null until the first PUT
  let failAfter = 0; // the n-th following save returns 500
  const log = [];
  const note = (line) => {
    log.push(line);
    if (!quiet) console.log(line);
  };

  const send = (res, status, body, type = 'application/json') => {
    res.writeHead(status, { 'Content-Type': type });
    res.end(type === 'application/json' && typeof body !== 'string' ? JSON.stringify(body) : body);
  };
  const readBody = (req) =>
    new Promise((ok) => {
      const chunks = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => ok(Buffer.concat(chunks).toString('utf8')));
    });

  // The §12 tree shape. Every file or folder whose name starts with "." is
  // skipped, together with everything inside it.
  function tree() {
    const rootNode = { children: new Map() };
    for (const [path, entry] of store) {
      const parts = path.split('/');
      if (parts.some((p) => p.startsWith('.'))) continue;
      let node = rootNode;
      parts.forEach((name, i) => {
        const sub = parts.slice(0, i + 1).join('/');
        if (i === parts.length - 1) {
          node.children.set(name, { id: sub, name, type: 'file', path: sub, size: entry.size ?? Buffer.byteLength(entry.content) });
        } else {
          if (!node.children.has(name)) node.children.set(name, { id: sub, name, type: 'folder', path: sub, children: new Map() });
          node = node.children.get(name);
        }
      });
    }
    const out = (n) => [...n.children.values()].map((c) => (c.children ? { ...c, children: out(c) } : c));
    return { storagePath: '/mock/gcode-files', tree: out(rootNode) };
  }

  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    const p = url.pathname;
    const m = req.method;
    if (/load|gcode-job|send-command/.test(p)) {
      note(`FORBIDDEN ${m} ${p}`);
      return send(res, 403, { error: 'forbidden in mock' });
    }
    note(`${m} ${p}${url.search}`);

    if (p === '/') return send(res, 200, readFileSync(join(ROOT, 'tools/harness.html')), 'text/html');

    if (p === `/api/plugins/${ID}/config-ui`) {
      const html = readFileSync(join(PLUGIN_DIR, 'config.html'), 'utf8');
      return send(res, 200, url.searchParams.has('raw') ? html : html.replaceAll('__SERVER_PORT__', String(port)), 'text/html');
    }
    if (p === `/api/plugins/${ID}/icon`) {
      const f = url.searchParams.get('file') || '';
      const full = join(PLUGIN_DIR, f);
      if (!f || f.includes('..') || !existsSync(full)) return send(res, 404, { error: 'not found' });
      const type = f.endsWith('.js') ? 'text/javascript' : f.endsWith('.svg') ? 'image/svg+xml' : 'application/octet-stream';
      return send(res, 200, readFileSync(full), type);
    }
    if (p === `/api/plugins/${ID}/settings`) {
      if (m === 'GET') return send(res, 200, settings ?? {});
      if (m === 'PUT') {
        settings = JSON.parse(await readBody(req));
        return send(res, 200, { success: true });
      }
    }
    // ncSender's units setting, read as {key, value} (§12). ncSender's default is metric.
    if (p === '/api/settings/unitsPreference' && m === 'GET') return send(res, 200, { key: 'unitsPreference', value: units });
    if (p === '/api/gcode-files' && m === 'GET') return send(res, 200, tree());
    if (p === '/api/gcode-files/file' && m === 'GET') {
      const path = url.searchParams.get('path') || '';
      const entry = !path.includes('..') && store.get(path);
      if (!entry || entry.content === undefined) return send(res, 404, { error: 'File not found' });
      return send(res, 200, { content: entry.content });
    }
    if (p === '/api/gcode-files/file/save' && m === 'POST') {
      let body;
      try {
        body = JSON.parse(await readBody(req));
      } catch {
        return send(res, 400, { error: 'bad JSON' });
      }
      if (typeof body.path !== 'string' || !body.path || typeof body.content !== 'string') {
        return send(res, 400, { error: 'path and content are required' });
      }
      if (body.path.includes('..')) return send(res, 500, { error: 'Invalid path' });
      if (failAfter > 0 && --failAfter === 0) {
        note(`  forced failure for ${body.path}`);
        return send(res, 500, { error: 'forced failure (mock)' });
      }
      const size = Buffer.byteLength(body.content);
      store.set(body.path, body.path.toLowerCase().endsWith('.stl') ? { size } : { content: body.content });
      note(`  saved ${body.path} (${size} bytes)`);
      return send(res, 200, { success: true });
    }

    if (p === '/__mock/fail-save' && m === 'POST') {
      failAfter = Number(JSON.parse((await readBody(req)) || '{}').after) || 0;
      return send(res, 200, { failAfter });
    }
    if (p === '/__mock/units' && m === 'POST') {
      units = JSON.parse((await readBody(req)) || '{}').units === 'imperial' ? 'imperial' : 'metric';
      return send(res, 200, { units });
    }
    if (p === '/__mock/store' && m === 'GET') {
      return send(res, 200, { settings, files: Object.fromEntries([...store].map(([k, v]) => [k, v.content !== undefined ? { size: Buffer.byteLength(v.content) } : v])) });
    }
    send(res, 404, { error: 'not found' });
  });

  return new Promise((ok) =>
    server.listen(port, '127.0.0.1', () => ok({ url: `http://localhost:${port}/`, log, close: () => new Promise((r) => server.close(r)) })),
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { url } = await startMock({ port: Number(process.argv[2]) || 8777, units: process.argv[3] === 'imperial' ? 'imperial' : 'metric' });
  console.log(`mock ncSender at ${url}`);
}
