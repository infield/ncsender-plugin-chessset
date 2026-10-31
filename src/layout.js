// layout.json, the job-level record (implementation plan P4.6; spec §5.8). Pure.
import { PLUGIN_ID } from './config.js';
import { roundHalfUp } from './units.js';

const r3 = (x) => roundHalfUp(x, 3);

export const sidesOf = (sides) => (sides === 'both' ? ['light', 'dark'] : [sides]);
export const blankFile = (side, index) => `${side}_blank_${String(index).padStart(2, '0')}.stl`;

export function buildLayout({ pluginVersion, pkg, inputs, plan, createdAt }) {
  const neckOn = inputs.neckEnabled === true;
  const blanks = [];
  for (const side of sidesOf(inputs.sides)) {
    for (const b of plan.blanks) {
      blanks.push({
        side,
        index: b.index,
        file: blankFile(side, b.index),
        pieces: b.pieces.map((p) => ({ role: p.role, xStart: r3(p.xStart), xEnd: r3(p.xEnd) })),
        usedLength: r3(b.used),
        leftoverLength: r3(b.leftover),
      });
    }
  }
  return {
    format: 'chess-set-creator-layout',
    formatVersion: 1,
    createdAt,
    plugin: { id: PLUGIN_ID, version: pluginVersion },
    package: { id: pkg.id, version: pkg.version, name: pkg.name },
    units: 'mm',
    frame: 'x-axis-base-at-origin-v1',
    turningAxis: 'X',
    onAxis: 'model-origin',
    scale: roundHalfUp(plan.scale, 6),
    queenBaseDiameter: r3(inputs.queenBase),
    stock: { length: r3(inputs.stockLength), width: r3(inputs.stockWidth), shape: inputs.stockShape, jawSet: plan.jawSet },
    reservations: { chuck: r3(inputs.chuckRes), tailstock: r3(inputs.tailRes) },
    gap: r3(inputs.gap),
    radialAllowance: r3(inputs.radialAllowance),
    supportOutcome: neckOn ? 'B' : 'A',
    neckDiameter: neckOn ? r3(inputs.neckDiameter) : null,
    coveredTops: neckOn ? plan.coveredTops : [],
    blanks,
  };
}
