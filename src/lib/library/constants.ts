export const PAGE_W = 0.21;
export const PAGE_H = 0.305;
export const COVER_PAD = 0.012;
export const COVER_W = PAGE_W + COVER_PAD;
export const COVER_H = PAGE_H + COVER_PAD * 1.6;
export const COVER_THICK = 0.0036;
export const PAGE_BLOCK = 0.024;
/** How far the readable sheets sit in front of the cover boards when open. */
export const PAGE_LIFT = 0.016;

export const SEG_X = 80;
export const SEG_Y = 52;

export const SHELF = {
  x: 0.08,
  y: 1.4,
  z: -3.58,
  rotY: Math.PI / 2,
  scale: 1,
};

export const PRESENT = {
  x: 0,
  y: 1.38,
  z: -1.15,
  rotY: 0,
  scale: 1.55,
};

export const READING = {
  x: 0,
  y: 1.36,
  z: -0.18,
  rotY: 0,
  scale: 1.78,
};

export const CAM = {
  approachFrom: { pos: [0, 1.62, 5.8] as const, look: [0.08, 1.42, -3.55] as const },
  shelf: { pos: [0, 1.5, -0.55] as const, look: [0.08, 1.4, -3.58] as const },
  cover: { pos: [0.16, 1.42, 1.15] as const, look: [0.16, 1.34, -1.15] as const },
  read: { pos: [0, 1.5, 0.78] as const, look: [0, 1.32, -0.18] as const },
};

export const APPROACH_SEC = 6.8;
export const EXTRACT_SEC = 1.85;
export const OPEN_SEC = 1.85;
export const FLIP_SEC = 1.28;
