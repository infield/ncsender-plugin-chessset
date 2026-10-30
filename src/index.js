// lib/app.js (implementation plan Detail 1). In the page it is the dialog;
// started as a Web Worker from its own source it runs the STL handlers.
import { createHandlers } from './worker.js';
import { mountApp } from './ui/app.js';

const BUILD = __BUILD__;
const PING_TIMEOUT_MS = 5000;

if (typeof document === 'undefined') {
  const handle = createHandlers();
  self.onmessage = async ({ data }) => {
    try {
      const result = await handle(data);
      self.postMessage({ id: data.id, ok: true, result }, result instanceof ArrayBuffer ? [result] : []);
    } catch (e) {
      self.postMessage({ id: data.id, ok: false, error: e.message || String(e) });
    }
  };
} else {
  const ChessSet = (window.ChessSet ||= {});
  ChessSet.build = BUILD;
  ChessSet.mount = async (root, host) => {
    try {
      await mountApp(root, host, await engine());
    } catch (e) {
      root.textContent = `Chess Set Creator could not start: ${e.message || e}`;
    }
  };

  // One engine per build. A plugin update without a page reload brings a
  // new build, so the old Worker is stopped and a new one started.
  const engine = () => {
    if (ChessSet.engineBuild !== BUILD) {
      ChessSet.engineHandle?.then((e) => e.worker?.terminate()).catch(() => {});
      ChessSet.engineBuild = BUILD;
      ChessSet.engineHandle = startEngine();
    }
    return ChessSet.engineHandle;
  };

  // Returns {call, worker}. `worker` is null when Workers are blocked; then
  // `call` runs the handlers in the page (import only; export refuses).
  async function startEngine() {
    let worker = null;
    try {
      worker = new Worker(URL.createObjectURL(new Blob([ChessSet.source || ''], { type: 'text/javascript' })));
    } catch {
      worker = null;
    }
    if (worker) {
      let seq = 0;
      const waiting = new Map();
      worker.onmessage = ({ data }) => {
        const w = waiting.get(data.id);
        if (!w) return;
        waiting.delete(data.id);
        if (data.ok) w.resolve(data.result);
        else w.reject(new Error(data.error));
      };
      worker.onerror = (e) => {
        for (const w of waiting.values()) w.reject(new Error(e.message || 'Worker error'));
        waiting.clear();
      };
      const call = (type, args = {}, transfer = []) =>
        new Promise((resolve, reject) => {
          const id = ++seq;
          waiting.set(id, { resolve, reject });
          worker.postMessage({ ...args, id, type }, transfer);
        });
      const ok = await Promise.race([
        call('ping').then(() => true, () => false),
        new Promise((r) => setTimeout(() => r(false), PING_TIMEOUT_MS)),
      ]);
      if (ok) return { call, worker };
      worker.terminate();
    }
    const handle = createHandlers();
    return { call: (type, args = {}) => handle({ ...args, type }), worker: null };
  }
}
