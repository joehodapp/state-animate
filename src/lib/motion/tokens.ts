/**
 * Published Material 3 motion tokens.
 *
 * Easing and duration: https://m3.material.io/styles/motion/easing-and-duration/tokens-specs
 * Springs: Compose ExpressiveMotionTokens / StandardMotionTokens, named
 * md.sys.motion.spring.* on https://m3.material.io/styles/motion/overview/how-it-works
 *
 * The scheme (expressive or standard) is chosen for the transition. It is not
 * part of the spring token name.
 */

export const EASING_IDS = [
  "emphasized",
  "emphasized-decelerate",
  "emphasized-accelerate",
  "standard",
  "standard-decelerate",
  "standard-accelerate",
  "linear",
] as const;

export type EasingId = (typeof EASING_IDS)[number];

export type EasingToken = {
  id: EasingId;
  label: string;
  token: string;
  /** CSS cubic-bezier control points. Emphasized uses the Android path instead. */
  cubic: readonly [number, number, number, number] | null;
  detail: string;
};

export const EASINGS: Record<EasingId, EasingToken> = {
  emphasized: {
    id: "emphasized",
    label: "Emphasized",
    token: "md.sys.motion.easing.emphasized",
    cubic: null,
    detail:
      "Android path interpolator M 0,0 C 0.05,0 0.133333,0.06 0.166666,0.4 C 0.208333,0.82 0.25,1 1,1. The spec gives CSS no single cubic-bezier and says to fall back to standard.",
  },
  "emphasized-decelerate": {
    id: "emphasized-decelerate",
    label: "Emphasized decelerate",
    token: "md.sys.motion.easing.emphasized.decelerate",
    cubic: [0.05, 0.7, 0.1, 1],
    detail: "cubic-bezier(0.05, 0.7, 0.1, 1.0)",
  },
  "emphasized-accelerate": {
    id: "emphasized-accelerate",
    label: "Emphasized accelerate",
    token: "md.sys.motion.easing.emphasized.accelerate",
    cubic: [0.3, 0, 0.8, 0.15],
    detail: "cubic-bezier(0.3, 0.0, 0.8, 0.15)",
  },
  standard: {
    id: "standard",
    label: "Standard",
    token: "md.sys.motion.easing.standard",
    cubic: [0.2, 0, 0, 1],
    detail: "cubic-bezier(0.2, 0.0, 0, 1.0)",
  },
  "standard-decelerate": {
    id: "standard-decelerate",
    label: "Standard decelerate",
    token: "md.sys.motion.easing.standard.decelerate",
    cubic: [0, 0, 0, 1],
    detail: "cubic-bezier(0, 0, 0, 1)",
  },
  "standard-accelerate": {
    id: "standard-accelerate",
    label: "Standard accelerate",
    token: "md.sys.motion.easing.standard.accelerate",
    cubic: [0.3, 0, 1, 1],
    detail: "cubic-bezier(0.3, 0, 1, 1)",
  },
  linear: {
    id: "linear",
    label: "Linear",
    token: "md.sys.motion.easing.linear",
    cubic: [0, 0, 1, 1],
    detail: "cubic-bezier(0, 0, 1, 1)",
  },
};

export const DURATION_IDS = [
  "short1",
  "short2",
  "short3",
  "short4",
  "medium1",
  "medium2",
  "medium3",
  "medium4",
  "long1",
  "long2",
  "long3",
  "long4",
  "extra-long1",
  "extra-long2",
  "extra-long3",
  "extra-long4",
] as const;

export type DurationId = (typeof DURATION_IDS)[number];

export type DurationToken = {
  id: DurationId;
  label: string;
  token: string;
  ms: number;
  group: "Short" | "Medium" | "Long" | "Extra long";
};

function duration(
  id: DurationId,
  ms: number,
  group: DurationToken["group"],
): DurationToken {
  return {
    id,
    label: `${id} · ${ms}ms`,
    token: `md.sys.motion.duration.${id}`,
    ms,
    group,
  };
}

export const DURATIONS: Record<DurationId, DurationToken> = {
  short1: duration("short1", 50, "Short"),
  short2: duration("short2", 100, "Short"),
  short3: duration("short3", 150, "Short"),
  short4: duration("short4", 200, "Short"),
  medium1: duration("medium1", 250, "Medium"),
  medium2: duration("medium2", 300, "Medium"),
  medium3: duration("medium3", 350, "Medium"),
  medium4: duration("medium4", 400, "Medium"),
  long1: duration("long1", 450, "Long"),
  long2: duration("long2", 500, "Long"),
  long3: duration("long3", 550, "Long"),
  long4: duration("long4", 600, "Long"),
  "extra-long1": duration("extra-long1", 700, "Extra long"),
  "extra-long2": duration("extra-long2", 800, "Extra long"),
  "extra-long3": duration("extra-long3", 900, "Extra long"),
  "extra-long4": duration("extra-long4", 1000, "Extra long"),
};

export const SCHEMES = ["expressive", "standard"] as const;
export type SchemeId = (typeof SCHEMES)[number];

export const SPRING_SPEEDS = ["fast", "default", "slow"] as const;
export type SpringSpeed = (typeof SPRING_SPEEDS)[number];

export const SPRING_KINDS = ["spatial", "effects"] as const;
export type SpringKind = (typeof SPRING_KINDS)[number];

export type SpringToken = {
  scheme: SchemeId;
  speed: SpringSpeed;
  kind: SpringKind;
  token: string;
  /** Damping ratio. 1 removes bounce. */
  damping: number;
  stiffness: number;
};

const SPRING_TABLE: Record<
  SchemeId,
  Record<SpringSpeed, Record<SpringKind, { damping: number; stiffness: number }>>
> = {
  expressive: {
    fast: {
      spatial: { damping: 0.6, stiffness: 800 },
      effects: { damping: 1, stiffness: 3800 },
    },
    default: {
      spatial: { damping: 0.8, stiffness: 380 },
      effects: { damping: 1, stiffness: 1600 },
    },
    slow: {
      spatial: { damping: 0.8, stiffness: 200 },
      effects: { damping: 1, stiffness: 800 },
    },
  },
  standard: {
    fast: {
      spatial: { damping: 0.9, stiffness: 1400 },
      effects: { damping: 1, stiffness: 3800 },
    },
    default: {
      spatial: { damping: 0.9, stiffness: 700 },
      effects: { damping: 1, stiffness: 1600 },
    },
    slow: {
      spatial: { damping: 0.9, stiffness: 300 },
      effects: { damping: 1, stiffness: 800 },
    },
  },
};

export function springToken(
  scheme: SchemeId,
  speed: SpringSpeed,
  kind: SpringKind,
): SpringToken {
  const value = SPRING_TABLE[scheme][speed][kind];
  return {
    scheme,
    speed,
    kind,
    token: `md.sys.motion.spring.${speed}.${kind}`,
    damping: value.damping,
    stiffness: value.stiffness,
  };
}

export function isEasingId(value: string): value is EasingId {
  return (EASING_IDS as readonly string[]).includes(value);
}

export function isDurationId(value: string): value is DurationId {
  return (DURATION_IDS as readonly string[]).includes(value);
}

export function isSchemeId(value: string): value is SchemeId {
  return (SCHEMES as readonly string[]).includes(value);
}

export function isSpringSpeed(value: string): value is SpringSpeed {
  return (SPRING_SPEEDS as readonly string[]).includes(value);
}
