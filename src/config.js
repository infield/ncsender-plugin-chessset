// Constants shared by every module. All lengths are in millimetres.
// Implementation plan P2 (`src/config.js`); spec §5.1, §5.5, §5.6, §5.8.

export const PLUGIN_ID = 'com.infield.chessset';
export const EXPORT_ROOT = 'chess set';
export const PACKAGE_ROOT = '.chess-set-creator/sets';

// Piece roles in the K, Q, B, N, R, P order the planner uses everywhere.
export const ROLES = ['king', 'queen', 'bishop', 'knight', 'rook', 'pawn'];
export const ROLE_LETTER = { king: 'K', queen: 'Q', bishop: 'B', knight: 'N', rook: 'R', pawn: 'P' };
export const COUNTS_PER_SIDE = [1, 1, 2, 2, 2, 8];

// Machine settings shown pre-filled in the first-run setup: the owner's
// AltMill and Vortex jaws (spec §5.1).
export const DEFAULT_MACHINE = Object.freeze({
  maxBlankLength: 914.4,
  jaws: Object.freeze([
    Object.freeze({ name: 'standard', min: 0, max: 22.86 }),
    Object.freeze({ name: 'alternate', min: 25.4, max: 63.5 }),
  ]),
});

export const NECK_OVERLAP = 0.5;
export const NECK_SEGMENTS = 64;
export const WELD_TOL = 0.001;
export const FRAME_TOL = 0.1;
export const BAND = 1.0;
export const PROFILE_STEP = 0.5;
export const MAX_COPIES = 999;

// §5.1 job defaults, in mm. Settings start from these (P4.7).
export const DEFAULT_INPUTS = Object.freeze({
  queenBase: 38.1,
  stockLength: 457.2,
  stockShape: 'square',
  stockWidth: 50.8,
  chuckRes: 25.4,
  tailRes: 19.05,
  gap: 10,
  radialAllowance: 1.5,
  sides: 'both',
  // Connecting necks (spec §5.5 outcome B). A switch until Phase 0 picks
  // the outcome: on = B (necks in the STL), off = A (empty gaps).
  neckEnabled: true,
  neckDiameter: 7.6,
});
