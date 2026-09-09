function clamp(v: number, a: number, b: number) {
  return v < a ? a : v > b ? b : v;
}

/**
 * Cylinder + cone page curl.
 * Plane lies in XY with x=0 at the spine, x=width at the fore-edge, facing +Z.
 * t=0: flat on the right. t=1: flat mirrored on the left.
 * Bottom-right corner leads so the sheet rolls as a cone, never edge-on.
 */
export function curlPoint(
  x: number,
  y: number,
  t: number,
  width: number,
  height: number,
  stiffness = 1,
): [number, number, number] {
  const p = clamp(t, 0, 1);
  if (p <= 0.001) return [x, y, 0];
  if (p >= 0.999) return [-x, y, 0];

  const w = Math.max(width, 1e-6);
  const h = Math.max(height, 1e-6);
  const u = clamp(x / w, 0, 1);
  const v = clamp((y + h * 0.5) / h, 0, 1);

  // Thumb at the bottom-right: that corner starts (and finishes) first.
  const lead = (1 - v) * 0.22 * u;
  const pt = clamp(p + lead * Math.sin(p * Math.PI), 0, 1);
  const theta = pt * Math.PI;
  const mid = Math.sin(pt * Math.PI);

  // Quarter-sine keeps the spine planted; power term sends the fore-edge around.
  const belly = Math.sin(u * Math.PI * 0.5);
  const edge = Math.pow(u, 1.12);
  const shape = belly * 0.58 + edge * 0.42;

  // Amplitude is large enough that at mid-turn the sheet faces the camera
  // instead of collapsing to a line. Stiffness damps this for hardcover boards.
  const stiff = Math.max(0.5, stiffness);
  const amp = (w * 1.05 * mid) / stiff;
  const corner = mid * (1 - v) * u * w * 0.1;
  const zLocal = shape * amp + corner;

  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return [x * c - zLocal * s, y, x * s + zLocal * c];
}

export function deformPlane(
  positions: Float32Array,
  originals: Float32Array,
  t: number,
  width: number,
  height: number,
  stiffness = 1,
) {
  for (let i = 0; i < originals.length; i += 3) {
    const [x, y, z] = curlPoint(
      originals[i]!,
      originals[i + 1]!,
      t,
      width,
      height,
      stiffness,
    );
    positions[i] = x;
    positions[i + 1] = y;
    positions[i + 2] = z;
  }
}
