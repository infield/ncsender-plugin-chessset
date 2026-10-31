// The dialog's stylesheet, injected once as <style id="csc-style">.
// ncSender CSS variables only. Tagged with the build (data-build). Selectors start with `.csc-shell .csc-main`
// so they outrank the host's `.plugin-dialog-content button` rule (AAxis 9).
const S = '.csc-shell .csc-main';

const CSS = `
.csc-shell { width: 1100px; max-width: 94vw; max-height: 82vh; display: flex; flex-direction: column; color: var(--color-text-primary); font-family: inherit; font-size: 14px; }
.csc-shell * { box-sizing: border-box; }
${S} { display: flex; flex-direction: column; min-height: 0; flex: 1; }
${S} .csc-head { position: sticky; top: 0; z-index: 2; background: var(--color-surface); display: flex; align-items: center; gap: 12px; padding: 14px 18px; border-bottom: 1px solid var(--color-border); }
${S} .csc-title { font-size: 1.15rem; font-weight: 700; }
${S} .csc-build { font-size: 11px; color: var(--color-text-secondary); }
${S} .csc-spacer { flex: 1; }
${S} .csc-body { display: grid; grid-template-columns: minmax(300px, 380px) 1fr; gap: 18px; padding: 16px 18px; overflow: auto; min-height: 0; }
${S} .csc-body.csc-single { grid-template-columns: minmax(0, 620px); justify-content: center; }
@media (max-width: 900px) { ${S} .csc-body { grid-template-columns: 1fr; } }
${S} .csc-col { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
${S} .csc-card { background: var(--color-surface-muted, var(--color-surface)); border: 1px solid var(--color-border); border-radius: var(--radius-small, 10px); padding: 14px; display: flex; flex-direction: column; gap: 10px; }
${S} .csc-card h3, ${S} .csc-card summary { margin: 0; font-size: 0.95rem; font-weight: 700; }
${S} details.csc-card > summary { cursor: pointer; }
${S} .csc-muted { color: var(--color-text-secondary); font-size: 12px; line-height: 1.45; }
${S} .csc-pkg-name { font-weight: 600; overflow-wrap: anywhere; }
${S} button { font: inherit; padding: 8px 14px; border-radius: var(--radius-small, 8px); border: 1px solid var(--color-border); background: var(--color-surface); color: var(--color-text-primary); cursor: pointer; }
${S} button:hover { border-color: var(--color-accent); }
${S} button:disabled { opacity: .5; cursor: default; }
${S} button.csc-primary { background: var(--color-accent); border-color: var(--color-accent); color: #fff; font-weight: 600; }
${S} button.csc-link { border: none; background: none; padding: 2px 4px; color: var(--color-text-secondary); }
${S} .csc-seg { display: inline-flex; border: 1px solid var(--color-border); border-radius: var(--radius-small, 8px); overflow: hidden; }
${S} .csc-seg button { border: none; border-radius: 0; padding: 6px 12px; background: transparent; }
${S} .csc-seg button.csc-on { background: var(--color-accent); color: #fff; }
${S} .csc-field { display: flex; flex-direction: column; gap: 3px; }
${S} .csc-field label { font-size: 12px; color: var(--color-text-secondary); }
${S} input[type="text"] { font: inherit; width: 100%; padding: 7px 9px; border-radius: var(--radius-small, 8px); border: 1px solid var(--color-border); background: var(--color-surface); color: var(--color-text-primary); }
${S} input.csc-bad { border-color: var(--color-danger, #e74c3c); }
${S} .csc-hint { font-size: 11px; color: var(--color-text-secondary); }
${S} .csc-hint.csc-bad { color: var(--color-danger, #e74c3c); }
${S} .csc-jaw { display: grid; grid-template-columns: 1.2fr 1fr 1fr auto; gap: 8px; align-items: end; }
${S} .csc-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
${S} .csc-errors { margin: 0; padding: 10px 12px 10px 28px; border-radius: var(--radius-small, 8px); border: 1px solid var(--color-danger, #e74c3c); color: var(--color-danger, #e74c3c); font-size: 13px; line-height: 1.5; overflow-wrap: anywhere; }
${S} .csc-banner { padding: 10px 12px; border-radius: var(--radius-small, 8px); border: 1px solid var(--color-danger, #e74c3c); color: var(--color-danger, #e74c3c); font-size: 13px; }
${S} .csc-ok { color: var(--color-success, #2ecc71); font-size: 13px; }
${S} table { border-collapse: collapse; width: 100%; font-size: 13px; }
${S} th, ${S} td { text-align: right; padding: 6px 8px; border-bottom: 1px solid var(--color-border); white-space: nowrap; }
${S} th:first-child, ${S} td:first-child { text-align: left; }
${S} th { font-weight: 600; color: var(--color-text-secondary); font-size: 12px; }
${S} .csc-hidden { display: none; }
${S} .csc-two { display: inline-flex; flex-direction: column; align-items: flex-end; line-height: 1.25; }
${S} .csc-two small { font-size: 11px; font-weight: 400; color: var(--color-text-secondary); }
${S} .csc-summary { display: flex; flex-direction: column; gap: 2px; font-weight: 600; }
${S} .csc-pieces { font-weight: 600; }
${S} .csc-kvs { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px 16px; font-size: 13px; }
${S} .csc-kv { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; border-bottom: 1px solid var(--color-border); padding: 3px 0; }
${S} .csc-kv span { color: var(--color-text-secondary); }
${S} .csc-kv b { font-weight: 500; text-align: right; }
${S} svg.csc-pv { width: 100%; height: auto; display: block; border-radius: 4px; }
${S} .csc-pv-stock { fill: var(--color-surface); stroke: var(--color-text-secondary); stroke-width: 1; vector-effect: non-scaling-stroke; }
${S} .csc-pv-res { fill: color-mix(in srgb, var(--color-danger, #e74c3c) 22%, transparent); }
${S} .csc-pv-axis { stroke: var(--color-text-secondary); stroke-width: 1; stroke-dasharray: 6 4; vector-effect: non-scaling-stroke; }
${S} .csc-pv-neck { fill: color-mix(in srgb, var(--color-text-secondary) 60%, transparent); }
${S} .csc-libset { display: flex; gap: 10px; align-items: center; padding: 8px 10px; border: 1px solid var(--color-border); border-radius: var(--radius-small, 8px); }
${S} button.csc-set { text-align: left; }
${S} button.csc-set.csc-on { border-color: var(--color-accent); opacity: 1; }
${S} .csc-downloads { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 2px; }
${S} .csc-downloads button.csc-link { color: var(--color-accent); text-align: left; }
${S} .csc-pv-piece { fill: color-mix(in srgb, var(--color-accent) 55%, transparent); stroke: var(--color-accent); stroke-width: 1; vector-effect: non-scaling-stroke; }
`;

// A plugin update without a page reload leaves the old build's style
// element in the page, so it is replaced when the build differs.
export function injectStyle(build = '') {
  let el = document.getElementById('csc-style');
  if (el && el.dataset.build === build) return;
  if (!el) {
    el = document.createElement('style');
    el.id = 'csc-style';
    document.head.append(el);
  }
  el.dataset.build = build;
  el.textContent = CSS;
}
