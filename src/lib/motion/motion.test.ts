import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sampleEasing } from "./ease";
import { describeTransition } from "./describe";
import {
  evaluateTransition,
  FADE_THROUGH_THRESHOLD,
  SHARED_AXIS_SLIDE_DP,
  transitionDurationMs,
} from "./patterns";
import {
  createDefaultProject,
  createTransition,
  durationOf,
  type ScreenState,
  type TransitionConfig,
} from "./project";
import { sampleSpring, springSettleMs } from "./spring";
import { buildTimeline, sampleProject } from "./timeline";
import { EASINGS, springToken } from "./tokens";

function pair(): { from: ScreenState; to: ScreenState } {
  const project = createDefaultProject();
  return { from: project.states[0], to: project.states[1] };
}

describe("easing tokens", () => {
  it("starts at 0 and ends at 1", () => {
    for (const id of Object.keys(EASINGS) as Array<keyof typeof EASINGS>) {
      assert.equal(sampleEasing(id, 0), 0);
      assert.ok(Math.abs(sampleEasing(id, 1) - 1) < 0.002, id);
    }
  });

  it("hits the emphasized path knot", () => {
    const y = sampleEasing("emphasized", 0.166666);
    assert.ok(Math.abs(y - 0.4) < 0.02, `expected ~0.4, got ${y}`);
    assert.ok(sampleEasing("emphasized", 0.08) < 0.4);
  });

  it("keeps standard distinct from emphasized decelerate", () => {
    const standard = sampleEasing("standard", 0.3);
    const decelerate = sampleEasing("emphasized-decelerate", 0.3);
    assert.ok(Math.abs(standard - decelerate) > 0.05);
  });
});

describe("springs", () => {
  it("uses the published expressive and standard values", () => {
    const expressive = springToken("expressive", "default", "spatial");
    assert.equal(expressive.token, "md.sys.motion.spring.default.spatial");
    assert.equal(expressive.damping, 0.8);
    assert.equal(expressive.stiffness, 380);
    const standard = springToken("standard", "fast", "spatial");
    assert.equal(standard.damping, 0.9);
    assert.equal(standard.stiffness, 1400);
    const effects = springToken("expressive", "fast", "effects");
    assert.equal(effects.damping, 1);
    assert.equal(effects.stiffness, 3800);
  });

  it("starts at rest and the spatial spring overshoots", () => {
    const start = sampleSpring(0, 0.6, 800);
    assert.ok(Math.abs(start.position) < 0.001);
    let peak = 0;
    for (let ms = 0; ms <= 1000; ms += 4) {
      peak = Math.max(peak, sampleSpring(ms / 1000, 0.6, 800).position);
    }
    assert.ok(peak > 1.05, `expected overshoot, peak ${peak}`);
  });

  it("does not overshoot a critically damped effects spring", () => {
    let peak = 0;
    for (let ms = 0; ms <= 1000; ms += 4) {
      peak = Math.max(peak, sampleSpring(ms / 1000, 1, 1600).position);
    }
    assert.ok(peak <= 1.001, `effects spring peaked at ${peak}`);
    const settled = springSettleMs(1, 1600);
    assert.ok(settled > 80 && settled < 2000);
  });
});

describe("patterns", () => {
  it("container transform reveals the incoming screen across the fade threshold", () => {
    const { from, to } = pair();
    const config = createTransition("container-transform");
    const duration = transitionDurationMs(config);
    assert.equal(duration, durationOf("long2"));
    const start = evaluateTransition(config, from, to, 0);
    assert.equal(start[1].alpha, 0);
    assert.equal(start[1].clip?.y, from.container === "row" ? 168 : -1);
    const early = evaluateTransition(config, from, to, duration * 0.02);
    assert.ok(early[1].alpha > 0);
    const end = evaluateTransition(config, from, to, duration);
    assert.equal(end[1].alpha, 1);
    assert.equal(end[1].clip?.w, 360);
  });

  it("shared axis slides 30dp and fades through", () => {
    const { from, to } = pair();
    const config: TransitionConfig = {
      ...createTransition("shared-axis"),
      axis: "x",
      forward: true,
    };
    const start = evaluateTransition(config, from, to, 0);
    assert.equal(start[0].alpha, 1);
    assert.equal(start[1].alpha, 0);
    assert.equal(start[1].dx, SHARED_AXIS_SLIDE_DP);
    const duration = transitionDurationMs(config);
    const end = evaluateTransition(config, from, to, duration);
    assert.equal(end[1].dx, 0);
    assert.ok(Math.abs(end[0].dx + SHARED_AXIS_SLIDE_DP) < 0.01);
    assert.equal(end[0].alpha, 0);
    assert.equal(end[1].alpha, 1);
  });

  it("fade through is sequential at the 0.35 threshold", () => {
    const { from, to } = pair();
    const config = createTransition("fade-through");
    config.driver = {
      kind: "easing",
      easing: "linear",
      duration: "medium2",
      incomingEasing: "linear",
      incomingDuration: "medium2",
      outgoingEasing: "linear",
      outgoingDuration: "medium2",
    };
    const duration = 300;
    const atSplit = evaluateTransition(config, from, to, duration * FADE_THROUGH_THRESHOLD);
    assert.ok(atSplit[0].alpha < 0.02);
    assert.ok(atSplit[1].alpha < 0.02);
    const before = evaluateTransition(config, from, to, duration * 0.1);
    assert.ok(before[0].alpha > 0.5);
    assert.equal(before[1].alpha, 0);
  });

  it("fade uses the asymmetric duration tokens", () => {
    const { from, to } = pair();
    const config = createTransition("fade");
    assert.equal(transitionDurationMs(config), 400);
    const midOutgoing = evaluateTransition(config, from, to, 150);
    assert.ok(midOutgoing[0].alpha < 0.05);
    const described = describeTransition(config).map((line) => line.token);
    assert.ok(described.includes("md.sys.motion.easing.emphasized.decelerate"));
    assert.ok(described.includes("md.sys.motion.duration.short3"));
    assert.ok(described.includes("md.sys.motion.duration.medium4"));
  });
});

describe("timeline", () => {
  it("builds a two-state reel inside the export limit", () => {
    const project = createDefaultProject();
    const timeline = buildTimeline(project);
    assert.equal(timeline.segments.length, 3);
    assert.ok(timeline.durationMs < 8000);
    assert.ok(timeline.durationMs > 1500);
    const first = sampleProject(project, 0);
    assert.equal(first.layers[0]?.stateId, "sites");
    const last = sampleProject(project, timeline.durationMs);
    assert.equal(last.segment?.kind, "hold");
  });
});
