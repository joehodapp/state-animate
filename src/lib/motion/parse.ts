import { isHoldMs, isContainerPreset, isDemoId, isPatternId, type Project, type ScreenState, type TransitionConfig } from "./project";
import { isDurationId, isEasingId, isSchemeId, isSpringSpeed } from "./tokens";

const DATA_URL = /^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=\s]+)$/;
const MAX_DATA_URL = 1_800_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function fail(message: string): never {
  throw new Error(message);
}

function parseDriver(value: unknown): TransitionConfig["driver"] {
  if (!isRecord(value) || (value.kind !== "easing" && value.kind !== "spring")) {
    fail("Each cut needs an easing or a spring driver.");
  }
  if (value.kind === "spring") {
    const scheme = String(value.scheme);
    const speed = String(value.speed);
    if (!isSchemeId(scheme) || !isSpringSpeed(speed)) {
      fail("That spring token is not part of the Material 3 set.");
    }
    return { kind: "spring", scheme, speed };
  }
  const easing = String(value.easing);
  const duration = String(value.duration);
  const incomingEasing = String(value.incomingEasing ?? easing);
  const incomingDuration = String(value.incomingDuration ?? duration);
  const outgoingEasing = String(value.outgoingEasing ?? easing);
  const outgoingDuration = String(value.outgoingDuration ?? duration);
  if (
    !isEasingId(easing) ||
    !isDurationId(duration) ||
    !isEasingId(incomingEasing) ||
    !isDurationId(incomingDuration) ||
    !isEasingId(outgoingEasing) ||
    !isDurationId(outgoingDuration)
  ) {
    fail("That easing or duration is not a Material 3 token.");
  }
  return {
    kind: "easing",
    easing,
    duration,
    incomingEasing,
    incomingDuration,
    outgoingEasing,
    outgoingDuration,
  };
}

function parseTransition(value: unknown): TransitionConfig {
  if (!isRecord(value)) fail("Pick a Material transition pattern.");
  const pattern = String(value.pattern);
  if (!isPatternId(pattern)) fail("Pick a Material transition pattern.");
  const axis = value.axis === "y" || value.axis === "z" ? value.axis : "x";
  return {
    pattern,
    driver: parseDriver(value.driver),
    axis,
    forward: value.forward !== false,
  };
}

function parseState(value: unknown): ScreenState {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.name !== "string") {
    fail("A state is missing its name.");
  }
  const container = String(value.container);
  const holdMs = Number(value.holdMs);
  if (!isContainerPreset(container) || !isHoldMs(holdMs)) {
    fail(`“${value.name}” has a container or hold Microcut does not use.`);
  }
  if (!isRecord(value.source)) fail(`“${value.name}” has no image.`);
  let source: ScreenState["source"];
  const demo = String(value.source.demo ?? "");
  if (value.source.type === "demo" && isDemoId(demo)) {
    source = { type: "demo", demo };
  } else if (value.source.type === "upload" && typeof value.source.dataUrl === "string") {
    if (!DATA_URL.test(value.source.dataUrl) || value.source.dataUrl.length > MAX_DATA_URL) {
      fail(`“${value.name}” needs to be a PNG, JPEG, or WebP under the export size limit.`);
    }
    source = { type: "upload", dataUrl: value.source.dataUrl };
  } else {
    fail(`“${value.name}” is not a sample screen or an uploaded image.`);
  }
  const name = value.name.trim().slice(0, 48);
  if (!name) fail("Name the state before exporting.");
  return {
    id: value.id.slice(0, 80),
    name,
    source,
    container,
    holdMs,
  };
}

export function parseProject(value: unknown): Project {
  if (!isRecord(value) || !Array.isArray(value.states) || !Array.isArray(value.order)) {
    fail("The reel could not be read.");
  }
  if (value.states.length > 12) fail("The library holds up to 12 screens.");
  if (value.order.length > 6) fail("The reel holds up to 6 states.");
  const states = value.states.map(parseState);
  const ids = new Set(states.map((state) => state.id));
  if (ids.size !== states.length) fail("Two states share an id.");
  const order = value.order.map((id) => {
    if (typeof id !== "string" || !ids.has(id)) fail("The reel points at a screen that is not in the library.");
    return id;
  });
  if (!Array.isArray(value.transitions) || value.transitions.length !== Math.max(0, order.length - 1)) {
    fail("Each pair of states needs one transition.");
  }
  return {
    states,
    order,
    transitions: value.transitions.map(parseTransition),
  };
}
