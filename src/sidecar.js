// The Rotary CAM handoff sidecar, <blank>.rotary.json (spec §5.11). Pure.
import { PLUGIN_ID } from './config.js';
import { roundHalfUp } from './units.js';

const r3 = (x) => roundHalfUp(x, 3);

export function buildSidecar({ blank, file, inputs, jawSet, pluginVersion, folder }) {
  return {
    format: 'rotary-setup',
    formatVersion: 1,
    model: file,
    units: 'mm',
    orientation: { turningAxis: 'X', chuckEnd: 'min', onAxis: 'model-origin', upAtZero: '+Z' },
    stock: { shape: inputs.stockShape, width: r3(inputs.stockWidth), length: r3(inputs.stockLength) },
    placement: { chuckOffset: r3(inputs.chuckRes), modelLength: r3(blank.used) },
    workholding: { jawSet, tailstock: true },
    source: { plugin: PLUGIN_ID, version: pluginVersion, job: folder },
  };
}
