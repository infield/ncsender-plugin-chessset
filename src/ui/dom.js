// Tiny DOM builder. Text is only ever set with textContent or text nodes,
// never parsed as HTML (P4.10, R11).

// h('div', {class:'x', onclick: fn, attrs:{...}}, child, 'text', [more]).
// Props: class, text, value, checked, disabled, type, attrs, dataset, on*.
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'attrs') for (const [a, av] of Object.entries(v)) el.setAttribute(a, av);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el[k] = v;
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

export function clear(el) {
  while (el.firstChild) el.firstChild.remove();
}
