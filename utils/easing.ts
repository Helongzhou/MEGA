/** Easing helpers shared by StepPlayer & celebration. */

export function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function easeOutCubic(t: number): number {
  const p = clamp01(t);
  return 1 - Math.pow(1 - p, 3);
}

/** Overshoot ease — magnet “snap” feel (SnapTiles-ish). */
export function easeOutBack(t: number, overshoot = 1.55): number {
  const p = clamp01(t);
  const c = overshoot;
  return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2);
}

export function easeInOutCubic(t: number): number {
  const p = clamp01(t);
  return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
}

export function easeInOut(t: number): number {
  return easeInOutCubic(t);
}

export function lerpVec3(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}
