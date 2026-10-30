// File Manager and plugin-settings client (implementation plan P4.7).
// Only these routes are used. The plugin never calls /api/gcode-files/load*,
// /api/gcode-job or /api/send-command.
import { PLUGIN_ID } from './config.js';

// Thrown when a response isn't OK. A network failure has status 0.
export class FmError extends Error {
  constructor(status, body) {
    super(`HTTP ${status || 'no connection'}${body ? `: ${body}` : ''}`);
    this.status = status;
    this.body = body;
  }
}

export function createFm(base = '') {
  const request = async (method, path, body) => {
    let res;
    try {
      res = await fetch(base + path, {
        method,
        headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (e) {
      throw new FmError(0, String(e.message || e));
    }
    return res;
  };
  const fail = async (res) => new FmError(res.status, await res.text().catch(() => ''));
  const settingsPath = `/api/plugins/${PLUGIN_ID}/settings`;

  return {
    async saveText(path, content) {
      const res = await request('POST', '/api/gcode-files/file/save', { path, content });
      if (!res.ok) throw await fail(res);
    },
    async readText(path) {
      const res = await request('GET', `/api/gcode-files/file?path=${encodeURIComponent(path)}`);
      if (res.status === 404) return null;
      if (!res.ok) throw await fail(res);
      return (await res.json()).content;
    },
    async tree() {
      const res = await request('GET', '/api/gcode-files');
      if (!res.ok) throw await fail(res);
      return res.json();
    },
    async getSettings() {
      const res = await request('GET', settingsPath);
      if (!res.ok) throw await fail(res);
      return res.json();
    },
    async putSettings(obj) {
      const res = await request('PUT', settingsPath, obj);
      if (!res.ok) throw await fail(res);
    },
  };
}
