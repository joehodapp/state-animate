import { springToken, type SchemeId, type SpringKind, type SpringSpeed } from "./tokens";

export type SpringSample = {
  /** Position of a rest-to-rest spring, 0 at t=0 and 1 at equilibrium. */
  position: number;
  velocity: number;
};

/**
 * Unit-mass spring used by Compose's SpringSimulation:
 * damping coefficient = 2 * dampingRatio * sqrt(stiffness).
 * Initial velocity is 0. The spec's third attribute is for gestures;
 * these preset tokens are played from rest.
 */
export function sampleSpring(
  timeSec: number,
  dampingRatio: number,
  stiffness: number,
): SpringSample {
  const t = Math.max(0, timeSec);
  const omega = Math.sqrt(stiffness);
  const x0 = -1;
  const v0 = 0;

  if (dampingRatio < 0.999) {
    const omegaD = omega * Math.sqrt(1 - dampingRatio * dampingRatio);
    const beta = dampingRatio * omega;
    const A = x0;
    const B = (v0 + beta * x0) / omegaD;
    const decay = Math.exp(-beta * t);
    const cos = Math.cos(omegaD * t);
    const sin = Math.sin(omegaD * t);
    const displacement = decay * (A * cos + B * sin);
    const velocity =
      -beta * decay * (A * cos + B * sin) +
      decay * (-A * omegaD * sin + B * omegaD * cos);
    return { position: 1 + displacement, velocity };
  }

  const A = x0;
  const B = v0 + omega * x0;
  const decay = Math.exp(-omega * t);
  const displacement = (A + B * t) * decay;
  const velocity = (B - omega * (A + B * t)) * decay;
  return { position: 1 + displacement, velocity };
}

const settleCache = new Map<string, number>();

/** Milliseconds until the spring stays within 0.15% of rest. Capped at 2s. */
export function springSettleMs(dampingRatio: number, stiffness: number): number {
  const key = `${dampingRatio}:${stiffness}`;
  const cached = settleCache.get(key);
  if (cached !== undefined) return cached;

  let stableFor = 0;
  let settled = 2000;
  for (let ms = 0; ms <= 2000; ms += 2) {
    const { position, velocity } = sampleSpring(ms / 1000, dampingRatio, stiffness);
    if (Math.abs(position - 1) < 0.0015 && Math.abs(velocity) < 0.02) {
      stableFor += 2;
      if (stableFor >= 40 && ms > 60) {
        settled = ms - 38;
        break;
      }
    } else {
      stableFor = 0;
    }
  }
  settleCache.set(key, settled);
  return settled;
}

export function sampleSchemeSpring(
  timeMs: number,
  scheme: SchemeId,
  speed: SpringSpeed,
  kind: SpringKind,
): number {
  const token = springToken(scheme, speed, kind);
  return sampleSpring(timeMs / 1000, token.damping, token.stiffness).position;
}

export function schemeSettleMs(
  scheme: SchemeId,
  speed: SpringSpeed,
  kind: SpringKind,
): number {
  const token = springToken(scheme, speed, kind);
  return springSettleMs(token.damping, token.stiffness);
}
