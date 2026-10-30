// Shared test data: spec Appendix B dimensions and the §5.1 job defaults (mm).
export const APPENDIX_B = {
  king: { axialLength: 78.0, baseDiameter: 30.0, sweptDiameter: 30.0, topDiameter: 10.59 },
  queen: { axialLength: 68.0, baseDiameter: 30.0, sweptDiameter: 30.0, topDiameter: 4.15 },
  bishop: { axialLength: 59.0, baseDiameter: 30.03, sweptDiameter: 30.03, topDiameter: 3.97 },
  knight: { axialLength: 59.0, baseDiameter: 30.0, sweptDiameter: 30.0, topDiameter: 8.15 },
  rook: { axialLength: 49.0, baseDiameter: 30.03, sweptDiameter: 30.03, topDiameter: 16.03 },
  pawn: { axialLength: 43.0, baseDiameter: 24.0, sweptDiameter: 24.0, topDiameter: 6.38 },
};

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
});

export const PACKAGE_DIR = 'packages/staunton-clarkerubber';
export const BAD_DIR = 'tests/fixtures/bad-packages';
