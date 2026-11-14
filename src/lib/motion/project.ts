import { DURATIONS, type DurationId, type EasingId, type SchemeId, type SpringSpeed } from "./tokens";

export const STAGE = {
  widthDp: 360,
  heightDp: 640,
  density: 2,
  fps: 30,
  maxExportMs: 8000,
  maxStates: 6,
} as const;

export const EXPORT_WIDTH = STAGE.widthDp * STAGE.density;
export const EXPORT_HEIGHT = STAGE.heightDp * STAGE.density;

/** md.sys.shape.corner.large */
export const SHAPE_CORNER_LARGE_DP = 16;

export const PATTERN_IDS = [
  "container-transform",
  "shared-axis",
  "fade-through",
  "fade",
] as const;

export type PatternId = (typeof PATTERN_IDS)[number];

export const CONTAINER_PRESETS = ["full", "card", "row"] as const;
export type ContainerPreset = (typeof CONTAINER_PRESETS)[number];

export type Rect = { x: number; y: number; w: number; h: number; r: number };

export const CONTAINERS: Record<ContainerPreset, Rect> = {
  full: { x: 0, y: 0, w: 360, h: 640, r: 0 },
  card: { x: 24, y: 132, w: 312, h: 208, r: SHAPE_CORNER_LARGE_DP },
  /** First row on the sample Sites screen. */
  row: { x: 16, y: 168, w: 328, h: 88, r: SHAPE_CORNER_LARGE_DP },
};

export const HOLD_MS = [400, 800, 1200, 1600] as const;
export type HoldMs = (typeof HOLD_MS)[number];

export const DEMO_IDS = ["sites", "harbor", "today"] as const;
export type DemoId = (typeof DEMO_IDS)[number];

export type ImageSource =
  | { type: "demo"; demo: DemoId }
  | { type: "upload"; dataUrl: string };

export type ScreenState = {
  id: string;
  name: string;
  source: ImageSource;
  container: ContainerPreset;
  holdMs: HoldMs;
};

export type EasingDriver = {
  kind: "easing";
  easing: EasingId;
  duration: DurationId;
  incomingEasing: EasingId;
  incomingDuration: DurationId;
  outgoingEasing: EasingId;
  outgoingDuration: DurationId;
};

export type SpringDriver = {
  kind: "spring";
  scheme: SchemeId;
  speed: SpringSpeed;
};

export type MotionDriver = EasingDriver | SpringDriver;

export type TransitionConfig = {
  pattern: PatternId;
  driver: MotionDriver;
  axis: "x" | "y" | "z";
  forward: boolean;
};

export type Project = {
  states: ScreenState[];
  order: string[];
  transitions: TransitionConfig[];
};

export function containerRect(preset: ContainerPreset): Rect {
  return { ...CONTAINERS[preset] };
}

export function specDriver(pattern: PatternId): EasingDriver {
  if (pattern === "fade") {
    return {
      kind: "easing",
      easing: "emphasized-decelerate",
      duration: "medium4",
      incomingEasing: "emphasized-decelerate",
      incomingDuration: "medium4",
      outgoingEasing: "emphasized-accelerate",
      outgoingDuration: "short3",
    };
  }
  const duration: DurationId = pattern === "container-transform" ? "long2" : "long1";
  return {
    kind: "easing",
    easing: "emphasized",
    duration,
    incomingEasing: "emphasized",
    incomingDuration: duration,
    outgoingEasing: "emphasized",
    outgoingDuration: duration,
  };
}

export function springDriverFor(pattern: PatternId): SpringDriver {
  const speed: SpringSpeed =
    pattern === "container-transform" || pattern === "fade-through" ? "slow" : "default";
  return { kind: "spring", scheme: "expressive", speed };
}

export function createTransition(pattern: PatternId = "container-transform"): TransitionConfig {
  return {
    pattern,
    driver: specDriver(pattern),
    axis: "x",
    forward: true,
  };
}

export function patternBetween(from: ScreenState, to: ScreenState): PatternId {
  if (
    from.source.type === "demo" &&
    from.source.demo === "sites" &&
    to.source.type === "demo" &&
    to.source.demo === "harbor"
  ) {
    return "container-transform";
  }
  if (to.source.type === "demo" && to.source.demo === "today") return "fade-through";
  return "container-transform";
}

export function createDefaultProject(): Project {
  const sites: ScreenState = {
    id: "sites",
    name: "Sites",
    source: { type: "demo", demo: "sites" },
    container: "row",
    holdMs: 800,
  };
  const harbor: ScreenState = {
    id: "harbor",
    name: "Harbor",
    source: { type: "demo", demo: "harbor" },
    container: "full",
    holdMs: 800,
  };
  const today: ScreenState = {
    id: "today",
    name: "Today",
    source: { type: "demo", demo: "today" },
    container: "full",
    holdMs: 800,
  };
  return {
    states: [sites, harbor, today],
    order: ["sites", "harbor"],
    transitions: [createTransition("container-transform")],
  };
}

export function stateById(project: Project, id: string): ScreenState | undefined {
  return project.states.find((state) => state.id === id);
}

export function screenSrc(state: ScreenState): string {
  if (state.source.type === "demo") return `/demo/${state.source.demo}.png`;
  return state.source.dataUrl;
}

export function withOrder(project: Project, order: string[]): Project {
  const transitions: TransitionConfig[] = [];
  for (let index = 0; index < order.length - 1; index += 1) {
    const existing = project.transitions[index];
    if (existing && project.order[index] === order[index] && project.order[index + 1] === order[index + 1]) {
      transitions.push(existing);
      continue;
    }
    const from = stateById(project, order[index]);
    const to = stateById(project, order[index + 1]);
    transitions.push(
      from && to ? createTransition(patternBetween(from, to)) : createTransition(),
    );
  }
  return { ...project, order, transitions };
}

export function isHoldMs(value: number): value is HoldMs {
  return (HOLD_MS as readonly number[]).includes(value);
}

export function isPatternId(value: string): value is PatternId {
  return (PATTERN_IDS as readonly string[]).includes(value);
}

export function isContainerPreset(value: string): value is ContainerPreset {
  return (CONTAINER_PRESETS as readonly string[]).includes(value);
}

export function isDemoId(value: string): value is DemoId {
  return (DEMO_IDS as readonly string[]).includes(value);
}

export function durationOf(id: DurationId): number {
  return DURATIONS[id].ms;
}
