/**
 * Python's `round()` rounds half to even ("banker's rounding"); JS
 * `Math.round` rounds half up. The reference engine uses `round()` on
 * interval arithmetic, so the port must round the same way or intervals
 * drift on exact .5 products (e.g. 2 * 1.25).
 */
export function pythonRound(x: number): number {
  const floor = Math.floor(x);
  const diff = x - floor;
  if (diff > 0.5) return floor + 1;
  if (diff < 0.5) return floor;
  return floor % 2 === 0 ? floor : floor + 1;
}

/**
 * Python's `round(x, digits)`, for serializing ease to 3 decimals the way
 * the reference does. Ease only ever moves in 0.05 steps, so a true tie at
 * the target digit cannot occur and scaling does not misround.
 */
export function roundTo(x: number, digits: number): number {
  const scale = 10 ** digits;
  return pythonRound(x * scale) / scale;
}

/**
 * Python's built-in `sum()` for floats. Since CPython 3.12 it is Neumaier
 * compensated summation (gh-100425), not naive left-to-right addition —
 * sum([0.4, 0.45, 0.4, ...]) is exactly 2.65 where a plain reduce gives
 * 2.6500000000000004. Company-demand means feed ranking scores, so the port
 * must add the same way or scores drift by an ULP and orderings can flip.
 */
export function pythonSum(vals: number[]): number {
  let sum = 0;
  let c = 0;
  for (const v of vals) {
    const t = sum + v;
    if (Math.abs(sum) >= Math.abs(v)) {
      c += sum - t + v;
    } else {
      c += v - t + sum;
    }
    sum = t;
  }
  return sum + c;
}
