import { EASINGS, type EasingId } from "./tokens";

type Point = readonly [number, number];

type Cubic = {
  p0: Point;
  p1: Point;
  p2: Point;
  p3: Point;
};

/**
 * md.sys.motion.easing.emphasized as published for Android:
 * pathInterpolator(M 0,0 C 0.05, 0, 0.133333, 0.06, 0.166666, 0.4
 *                  C 0.208333, 0.82, 0.25, 1, 1, 1)
 */
const EMPHASIZED_PATH: readonly Cubic[] = [
  {
    p0: [0, 0],
    p1: [0.05, 0],
    p2: [0.133333, 0.06],
    p3: [0.166666, 0.4],
  },
  {
    p0: [0.166666, 0.4],
    p1: [0.208333, 0.82],
    p2: [0.25, 1],
    p3: [1, 1],
  },
];

function cubicPoint(cubic: Cubic, t: number): Point {
  const u = 1 - t;
  const x =
    u * u * u * cubic.p0[0] +
    3 * u * u * t * cubic.p1[0] +
    3 * u * t * t * cubic.p2[0] +
    t * t * t * cubic.p3[0];
  const y =
    u * u * u * cubic.p0[1] +
    3 * u * u * t * cubic.p1[1] +
    3 * u * t * t * cubic.p2[1] +
    t * t * t * cubic.p3[1];
  return [x, y];
}

/** X is monotonic on every published M3 curve, so bisection is exact enough. */
function solveT(cubic: Cubic, xTarget: number): number {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 28; i += 1) {
    const mid = (lo + hi) / 2;
    if (cubicPoint(cubic, mid)[0] < xTarget) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

function sampleCubic(cubic: Cubic, x: number): number {
  if (x <= 0) return cubic.p0[1];
  if (x >= 1) return cubic.p3[1];
  return cubicPoint(cubic, solveT(cubic, x))[1];
}

export function sampleEasing(id: EasingId, time: number): number {
  if (time <= 0) return 0;
  if (time >= 1) return 1;
  if (id === "emphasized") {
    const segment =
      time <= EMPHASIZED_PATH[0].p3[0] ? EMPHASIZED_PATH[0] : EMPHASIZED_PATH[1];
    return sampleCubic(segment, time);
  }
  const cubic = EASINGS[id].cubic;
  if (!cubic) return time;
  return sampleCubic(
    {
      p0: [0, 0],
      p1: [cubic[0], cubic[1]],
      p2: [cubic[2], cubic[3]],
      p3: [1, 1],
    },
    time,
  );
}
