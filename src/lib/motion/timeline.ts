import { evaluateTransition, holdLayers, transitionDurationMs, type Layer } from "./patterns";
import { stateById, type Project, type TransitionConfig } from "./project";

export type HoldSegment = {
  kind: "hold";
  stateId: string;
  startMs: number;
  endMs: number;
};

export type TransitionSegment = {
  kind: "transition";
  index: number;
  fromId: string;
  toId: string;
  config: TransitionConfig;
  startMs: number;
  endMs: number;
};

export type Segment = HoldSegment | TransitionSegment;

export type Timeline = {
  segments: Segment[];
  durationMs: number;
};

export function buildTimeline(project: Project): Timeline {
  const segments: Segment[] = [];
  let cursor = 0;

  project.order.forEach((stateId, index) => {
    const state = stateById(project, stateId);
    const hold = state?.holdMs ?? 800;
    segments.push({
      kind: "hold",
      stateId,
      startMs: cursor,
      endMs: cursor + hold,
    });
    cursor += hold;

    const nextId = project.order[index + 1];
    const config = project.transitions[index];
    if (!nextId || !config) return;
    const duration = transitionDurationMs(config);
    segments.push({
      kind: "transition",
      index,
      fromId: stateId,
      toId: nextId,
      config,
      startMs: cursor,
      endMs: cursor + duration,
    });
    cursor += duration;
  });

  return { segments, durationMs: cursor };
}

export type Sample = {
  layers: Layer[];
  segment: Segment | null;
};

export function sampleProject(project: Project, timeMs: number): Sample {
  const timeline = buildTimeline(project);
  if (timeline.segments.length === 0) return { layers: [], segment: null };

  const time = Math.min(Math.max(0, timeMs), timeline.durationMs);
  const segment =
    timeline.segments.find((item, index) => {
      const last = index === timeline.segments.length - 1;
      return time >= item.startMs && (last ? time <= item.endMs : time < item.endMs);
    }) ?? timeline.segments[timeline.segments.length - 1];

  if (segment.kind === "hold") {
    return { layers: holdLayers(segment.stateId), segment };
  }

  const from = stateById(project, segment.fromId);
  const to = stateById(project, segment.toId);
  if (!from || !to) return { layers: [], segment };

  return {
    layers: evaluateTransition(segment.config, from, to, time - segment.startMs),
    segment,
  };
}
