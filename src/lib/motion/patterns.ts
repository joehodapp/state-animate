import { sampleEasing } from "./ease";
import {
  containerRect,
  durationOf,
  type Rect,
  type ScreenState,
  type TransitionConfig,
} from "./project";
import { schemeSettleMs, sampleSchemeSpring } from "./spring";

/** MaterialContainerTransform enter thresholds, FADE_MODE_IN. */
export const CONTAINER_FADE_END = 0.25;
export const CONTAINER_SHAPE_END = 0.75;

/** FadeThroughProvider.FADE_THROUGH_THRESHOLD */
export const FADE_THROUGH_THRESHOLD = 0.35;

/** mtrl_transition_shared_axis_slide_distance */
export const SHARED_AXIS_SLIDE_DP = 30;

/** ScaleProvider defaults used by MaterialSharedAxis on Z. */
export const SHARED_AXIS_IN_SCALE = 0.8;
export const SHARED_AXIS_OUT_SCALE = 1.1;

/** MaterialFadeThrough incoming start scale. */
export const FADE_THROUGH_IN_SCALE = 0.92;

/** MaterialFade: incomingEndThreshold and incoming start scale. */
export const FADE_INCOMING_END = 0.3;
export const FADE_IN_SCALE = 0.8;

export type Layer = {
  stateId: string;
  alpha: number;
  dx: number;
  dy: number;
  scale: number;
  clip: Rect | null;
};

export function transitionDurationMs(config: TransitionConfig): number {
  if (config.driver.kind === "spring") {
    const spatial = schemeSettleMs(config.driver.scheme, config.driver.speed, "spatial");
    const effects = schemeSettleMs(config.driver.scheme, config.driver.speed, "effects");
    if (config.pattern === "fade") return effects;
    return Math.max(spatial, effects);
  }
  if (config.pattern === "fade") {
    return Math.max(
      durationOf(config.driver.incomingDuration),
      durationOf(config.driver.outgoingDuration),
    );
  }
  return durationOf(config.driver.duration);
}

export function subprogress(progress: number, start: number, end: number): number {
  if (progress <= start) return 0;
  if (progress >= end) return 1;
  return (progress - start) / (end - start);
}

export function clamp01(value: number): number {
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpRect(from: Rect, to: Rect, boundsT: number, radiusT: number): Rect {
  return {
    x: lerp(from.x, to.x, boundsT),
    y: lerp(from.y, to.y, boundsT),
    w: Math.max(1, lerp(from.w, to.w, boundsT)),
    h: Math.max(1, lerp(from.h, to.h, boundsT)),
    r: Math.max(0, lerp(from.r, to.r, clamp01(radiusT))),
  };
}

function still(stateId: string, alpha = 1): Layer {
  return { stateId, alpha, dx: 0, dy: 0, scale: 1, clip: null };
}

type Clocks = { spatial: number; effects: number };

function clocksAt(config: TransitionConfig, timeMs: number): Clocks {
  const driver = config.driver;
  if (driver.kind === "spring") {
    return {
      spatial: sampleSchemeSpring(timeMs, driver.scheme, driver.speed, "spatial"),
      effects: sampleSchemeSpring(timeMs, driver.scheme, driver.speed, "effects"),
    };
  }
  const duration = durationOf(driver.duration);
  const progress = sampleEasing(driver.easing, clamp01(timeMs / duration));
  return { spatial: progress, effects: progress };
}

function containerTransform(
  config: TransitionConfig,
  from: ScreenState,
  to: ScreenState,
  timeMs: number,
): Layer[] {
  const { spatial, effects } = clocksAt(config, timeMs);
  const boundsT = Math.max(0, spatial);
  const shapeT = subprogress(Math.max(0, spatial), 0, CONTAINER_SHAPE_END);
  const fade = subprogress(clamp01(effects), 0, CONTAINER_FADE_END);
  const clip = lerpRect(containerRect(from.container), containerRect(to.container), boundsT, shapeT);
  return [still(from.id, 1), { ...still(to.id, fade), clip }];
}

function sharedAxis(
  config: TransitionConfig,
  from: ScreenState,
  to: ScreenState,
  timeMs: number,
): Layer[] {
  const { spatial, effects } = clocksAt(config, timeMs);
  const sign = config.forward ? 1 : -1;
  const travel = Math.max(0, spatial);
  let inDx = 0;
  let inDy = 0;
  let outDx = 0;
  let outDy = 0;
  let inScale = 1;
  let outScale = 1;

  if (config.axis === "x") {
    inDx = lerp(sign * SHARED_AXIS_SLIDE_DP, 0, travel);
    outDx = lerp(0, -sign * SHARED_AXIS_SLIDE_DP, travel);
  } else if (config.axis === "y") {
    inDy = lerp(sign * SHARED_AXIS_SLIDE_DP, 0, travel);
    outDy = lerp(0, -sign * SHARED_AXIS_SLIDE_DP, travel);
  } else if (config.forward) {
    inScale = lerp(SHARED_AXIS_IN_SCALE, 1, travel);
    outScale = lerp(1, SHARED_AXIS_OUT_SCALE, travel);
  } else {
    inScale = lerp(SHARED_AXIS_OUT_SCALE, 1, travel);
    outScale = lerp(1, SHARED_AXIS_IN_SCALE, travel);
  }

  const easedFade = clamp01(effects);
  const outAlpha = 1 - subprogress(easedFade, 0, FADE_THROUGH_THRESHOLD);
  const inAlpha = subprogress(easedFade, FADE_THROUGH_THRESHOLD, 1);

  return [
    { ...still(from.id, outAlpha), dx: outDx, dy: outDy, scale: outScale },
    { ...still(to.id, inAlpha), dx: inDx, dy: inDy, scale: inScale },
  ];
}

function fadeThrough(
  config: TransitionConfig,
  from: ScreenState,
  to: ScreenState,
  timeMs: number,
): Layer[] {
  const { spatial, effects } = clocksAt(config, timeMs);
  const easedFade = clamp01(effects);
  const outAlpha = 1 - subprogress(easedFade, 0, FADE_THROUGH_THRESHOLD);
  const inAlpha = subprogress(easedFade, FADE_THROUGH_THRESHOLD, 1);
  const inScale = lerp(FADE_THROUGH_IN_SCALE, 1, Math.max(0, spatial));
  return [
    still(from.id, outAlpha),
    { ...still(to.id, inAlpha), scale: inScale },
  ];
}

function fade(
  config: TransitionConfig,
  from: ScreenState,
  to: ScreenState,
  timeMs: number,
): Layer[] {
  const driver = config.driver;
  let incomingProgress: number;
  let outgoingProgress: number;
  let scaleProgress: number;

  if (driver.kind === "spring") {
    const effects = clamp01(
      sampleSchemeSpring(timeMs, driver.scheme, driver.speed, "effects"),
    );
    scaleProgress = Math.max(
      0,
      sampleSchemeSpring(timeMs, driver.scheme, driver.speed, "spatial"),
    );
    incomingProgress = effects;
    outgoingProgress = effects;
  } else {
    const inDur = durationOf(driver.incomingDuration);
    const outDur = durationOf(driver.outgoingDuration);
    incomingProgress = sampleEasing(driver.incomingEasing, clamp01(timeMs / inDur));
    outgoingProgress = sampleEasing(driver.outgoingEasing, clamp01(timeMs / outDur));
    scaleProgress = Math.max(0, incomingProgress);
  }

  const inAlpha = subprogress(clamp01(incomingProgress), 0, FADE_INCOMING_END);
  const outAlpha = 1 - clamp01(outgoingProgress);
  const inScale = lerp(FADE_IN_SCALE, 1, scaleProgress);

  return [still(from.id, outAlpha), { ...still(to.id, inAlpha), scale: inScale }];
}

export function evaluateTransition(
  config: TransitionConfig,
  from: ScreenState,
  to: ScreenState,
  timeMs: number,
): Layer[] {
  const local = Math.max(0, timeMs);
  switch (config.pattern) {
    case "container-transform":
      return containerTransform(config, from, to, local);
    case "shared-axis":
      return sharedAxis(config, from, to, local);
    case "fade-through":
      return fadeThrough(config, from, to, local);
    case "fade":
      return fade(config, from, to, local);
  }
}

export function holdLayers(stateId: string): Layer[] {
  return [still(stateId)];
}
