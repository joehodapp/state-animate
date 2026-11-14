"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Pause, Play, RotateCcw, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { fileToScreen, nameFromFile } from "@/lib/images/file-to-screen";
import { describeTransition, patternCopy } from "@/lib/motion/describe";
import {
  CONTAINER_PRESETS,
  HOLD_MS,
  PATTERN_IDS,
  createDefaultProject,
  screenSrc,
  specDriver,
  springDriverFor,
  stateById,
  withOrder,
  type ContainerPreset,
  type EasingDriver,
  type HoldMs,
  type PatternId,
  type Project,
  type ScreenState,
  type TransitionConfig,
} from "@/lib/motion/project";
import { transitionDurationMs } from "@/lib/motion/patterns";
import { buildTimeline, sampleProject } from "@/lib/motion/timeline";
import { DURATIONS, EASINGS, EASING_IDS, DURATION_IDS, SCHEMES, SPRING_SPEEDS } from "@/lib/motion/tokens";
import { drawFrame, type Drawable } from "@/lib/render/draw-frame";
import { TokenField } from "./token-field";

type Selection =
  | { kind: "state"; index: number }
  | { kind: "transition"; index: number };

type Pane = "preview" | "screens" | "motion";

const PATTERN_LABEL: Record<PatternId, string> = {
  "container-transform": "Container transform",
  "shared-axis": "Shared axis",
  "fade-through": "Fade through",
  fade: "Fade",
};

const CONTAINER_LABEL: Record<ContainerPreset, string> = {
  full: "Full screen",
  card: "Card",
  row: "List row",
};

function formatSeconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

function easingOptions() {
  return EASING_IDS.map((id) => ({
    value: id,
    label: EASINGS[id].label,
  }));
}

function durationOptions() {
  return DURATION_IDS.map((id) => ({
    value: id,
    label: DURATIONS[id].label,
    group: DURATIONS[id].group,
  }));
}

export function Studio() {
  const [project, setProject] = useState<Project>(() => createDefaultProject());
  const [selection, setSelection] = useState<Selection>({ kind: "transition", index: 0 });
  const [playhead, setPlayhead] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [pane, setPane] = useState<Pane>("preview");
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [loadKey, setLoadKey] = useState(0);
  const [readyKey, setReadyKey] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<Map<string, Drawable>>(new Map());
  const playheadRef = useRef(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const timeline = useMemo(() => buildTimeline(project), [project]);
  const shownPlayhead = Math.min(playhead, timeline.durationMs);
  const sample = useMemo(
    () => sampleProject(project, shownPlayhead),
    [project, shownPlayhead],
  );
  const statesKey = project.states.map((state) => `${state.id}:${screenSrc(state).length}`).join("|");
  const imagesReady = readyKey === `${statesKey}:${loadKey}` && !imageError;

  useEffect(() => {
    playheadRef.current = shownPlayhead;
  }, [shownPlayhead]);

  useEffect(() => {
    let cancelled = false;
    const images = new Map<string, Drawable>();
    const key = `${statesKey}:${loadKey}`;

    async function load() {
      try {
        await Promise.all(
          project.states.map(async (state) => {
            const image = new window.Image();
            image.src = screenSrc(state);
            await image.decode();
            images.set(state.id, image);
          }),
        );
        if (cancelled) return;
        imagesRef.current = images;
        setReadyKey(key);
        setImageError(null);
      } catch (loadError) {
        console.error(loadError);
        if (cancelled) return;
        setImageError("A screen image did not load. Check the file and try again.");
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [project.states, statesKey, loadKey]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imagesReady || project.order.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = 720;
    canvas.height = 1280;
    drawFrame(ctx, sample.layers, imagesRef.current);
  }, [sample, imagesReady, project.order.length, loadKey]);

  useEffect(() => {
    if (!playing) return;
    const origin = playheadRef.current;
    const started = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const next = Math.min(timeline.durationMs, origin + (now - started));
      playheadRef.current = next;
      setPlayhead(next);
      if (next >= timeline.durationMs) {
        setPlaying(false);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, timeline.durationMs]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.code !== "Space") return;
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        return;
      }
      event.preventDefault();
      if (timeline.durationMs <= 0) return;
      setPlaying((value) => {
        if (!value && playheadRef.current >= timeline.durationMs - 16) {
          playheadRef.current = 0;
          setPlayhead(0);
        }
        return !value;
      });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [timeline.durationMs]);

  function updateState(id: string, patch: Partial<ScreenState>) {
    setProject((current) => ({
      ...current,
      states: current.states.map((state) => (state.id === id ? { ...state, ...patch } : state)),
    }));
  }

  function updateTransition(index: number, next: TransitionConfig) {
    setProject((current) => ({
      ...current,
      transitions: current.transitions.map((item, itemIndex) => (itemIndex === index ? next : item)),
    }));
  }

  async function onUpload(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setError(null);
    const additions: ScreenState[] = [];
    try {
      for (const file of Array.from(fileList)) {
        if (project.states.length + additions.length >= 12) {
          throw new Error("The library holds 12 screens. Remove one before uploading another.");
        }
        const dataUrl = await fileToScreen(file);
        additions.push({
          id: crypto.randomUUID(),
          name: nameFromFile(file),
          source: { type: "upload", dataUrl },
          container: "full",
          holdMs: 800,
        });
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "That image could not be added.");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    setProject((current) => {
      let next: Project = { ...current, states: [...current.states, ...additions] };
      for (const state of additions) {
        if (next.order.length >= 6) break;
        next = withOrder(next, [...next.order, state.id]);
      }
      return next;
    });
    setSelection({ kind: "state", index: project.order.length });
    setPane("preview");
    if (fileRef.current) fileRef.current.value = "";
  }

  function addToReel(id: string) {
    if (project.order.length >= 6) {
      setError("The reel holds 6 states. Remove one to add another.");
      return;
    }
    setError(null);
    const nextOrder = [...project.order, id];
    setProject((current) => withOrder(current, nextOrder));
    setSelection({ kind: "state", index: nextOrder.length - 1 });
  }

  function removeFromReel(index: number) {
    const nextOrder = project.order.filter((_, itemIndex) => itemIndex !== index);
    setProject((current) => withOrder(current, nextOrder));
    setPlaying(false);
    setSelection(
      nextOrder.length > 1
        ? { kind: "transition", index: Math.max(0, Math.min(index, nextOrder.length - 2)) }
        : { kind: "state", index: 0 },
    );
  }

  function moveState(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= project.order.length) return;
    const nextOrder = [...project.order];
    const [moved] = nextOrder.splice(index, 1);
    nextOrder.splice(target, 0, moved);
    setProject((current) => withOrder(current, nextOrder));
    setSelection({ kind: "state", index: target });
  }

  function deleteUpload(id: string) {
    setProject((current) => {
      const states = current.states.filter((state) => state.id !== id);
      const order = current.order.filter((stateId) => stateId !== id);
      return withOrder({ ...current, states }, order);
    });
  }

  function restoreSample() {
    setProject((current) => {
      const sampleProjectState = createDefaultProject();
      const uploads = current.states.filter((state) => state.source.type === "upload");
      return { ...sampleProjectState, states: [...sampleProjectState.states, ...uploads] };
    });
    setSelection({ kind: "transition", index: 0 });
    setPlayhead(0);
    setPlaying(false);
    setError(null);
    setPane("preview");
  }

  async function onExport() {
    setError(null);
    setExporting(true);
    setPlaying(false);
    try {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(project),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Export failed.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "microcut.mp4";
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "Export failed.");
    } finally {
      setExporting(false);
    }
  }

  const selectedState =
    selection.kind === "state" ? stateById(project, project.order[selection.index] ?? "") : undefined;
  const selectedTransition =
    selection.kind === "transition" ? project.transitions[selection.index] : undefined;
  const fromState =
    selection.kind === "transition"
      ? stateById(project, project.order[selection.index] ?? "")
      : undefined;
  const toState =
    selection.kind === "transition"
      ? stateById(project, project.order[selection.index + 1] ?? "")
      : undefined;

  const segmentLabel = (() => {
    if (!sample.segment) return "Nothing on the reel";
    if (sample.segment.kind === "hold") {
      const state = stateById(project, sample.segment.stateId);
      return `Hold · ${state?.name ?? "State"}`;
    }
    return patternCopy(sample.segment.config.pattern).title;
  })();

  const canExport = project.order.length >= 2 && imagesReady && !exporting && !imageError;

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      <header className="flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-[0.16em] text-primary uppercase">Microcut</p>
          <h1 className="truncate text-base font-semibold sm:text-lg">
            Still screens, cut with Material 3
          </h1>
        </div>
        <Button type="button" disabled={!canExport} onClick={() => void onExport()}>
          {exporting ? "Rendering MP4…" : "Export MP4"}
        </Button>
      </header>

      <div className="flex border-b lg:hidden">
        {(
          [
            ["preview", "Preview"],
            ["screens", "Screens"],
            ["motion", "Motion"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`flex-1 px-3 py-2 text-sm ${pane === id ? "border-b-2 border-primary font-medium" : "text-muted-foreground"}`}
            onClick={() => setPane(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[280px_minmax(0,1fr)_320px]">
        <aside className={`${pane === "screens" ? "flex" : "hidden"} min-h-0 flex-col border-b lg:flex lg:border-r lg:border-b-0`}>
          <Library
            project={project}
            onUpload={(files) => void onUpload(files)}
            onAdd={addToReel}
            onDelete={deleteUpload}
            onRestore={restoreSample}
            fileRef={fileRef}
          />
        </aside>

        <main className={`${pane === "preview" ? "flex" : "hidden"} min-h-0 flex-col lg:flex`}>
          <Preview
            canvasRef={canvasRef}
            empty={project.order.length === 0}
            loading={!imagesReady && !imageError && project.order.length > 0}
            imageError={imageError}
            segmentLabel={segmentLabel}
            onRestore={restoreSample}
            onRetry={() => {
              setImageError(null);
              setReadyKey(null);
              setLoadKey((value) => value + 1);
            }}
          />
        </main>

        <aside className={`${pane === "motion" ? "flex" : "hidden"} min-h-0 flex-col border-t lg:flex lg:border-t-0 lg:border-l`}>
          <Inspector
            project={project}
            state={selectedState}
            transition={selectedTransition}
            fromName={fromState?.name}
            toName={toState?.name}
            sameFullContainer={
              fromState?.container === "full" && toState?.container === "full"
            }
            onState={(patch) => {
              if (selectedState) updateState(selectedState.id, patch);
            }}
            onTransition={(next) => {
              if (selection.kind === "transition") updateTransition(selection.index, next);
            }}
            onMove={(direction) => {
              if (selection.kind === "state") moveState(selection.index, direction);
            }}
            onRemove={() => {
              if (selection.kind === "state") removeFromReel(selection.index);
            }}
          />
        </aside>
      </div>

      {error ? (
        <div role="alert" className="border-t bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <footer className="border-t px-3 py-3 sm:px-4">
        <Timeline
          project={project}
          selection={selection}
          playhead={shownPlayhead}
          durationMs={timeline.durationMs}
          playing={playing}
          segmentLabel={segmentLabel}
          onSelect={(next) => {
            setSelection(next);
            setPane("motion");
          }}
          onPlayhead={(value) => {
            setPlaying(false);
            setPlayhead(value);
          }}
          onTogglePlay={() => {
            if (timeline.durationMs <= 0) return;
            setPlaying((value) => {
              if (!value && playheadRef.current >= timeline.durationMs - 16) {
                playheadRef.current = 0;
                setPlayhead(0);
              }
              return !value;
            });
          }}
          onRestart={() => {
            setPlaying(false);
            playheadRef.current = 0;
            setPlayhead(0);
          }}
          onClear={() => {
            setPlaying(false);
            setPlayhead(0);
            setProject((current) => withOrder(current, []));
          }}
        />
      </footer>
    </div>
  );
}

function Library({
  project,
  onUpload,
  onAdd,
  onDelete,
  onRestore,
  fileRef,
}: {
  project: Project;
  onUpload: (files: FileList | null) => void;
  onAdd: (id: string) => void;
  onDelete: (id: string) => void;
  onRestore: () => void;
  fileRef: RefObject<HTMLInputElement | null>;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">Screens</h2>
          <p className="text-xs text-muted-foreground">Each image is a named state.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
          <Upload />
          Upload
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          className="sr-only"
          onChange={(event) => onUpload(event.target.files)}
        />
      </div>
      <Separator />
      <div className="min-h-0 flex-1 overflow-auto px-3 py-3">
        {project.states.length === 0 ? (
          <div className="rounded-xl border border-dashed px-3 py-6 text-sm text-muted-foreground">
            No screens yet. Upload a PNG, JPEG, or WebP, or restore the Fieldnote samples.
          </div>
        ) : (
          <ul className="space-y-2">
            {project.states.map((state) => {
              const uses = project.order.filter((id) => id === state.id).length;
              return (
                <li key={state.id} className="flex items-center gap-3 rounded-xl border bg-card p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={screenSrc(state)}
                    alt=""
                    className="h-16 w-9 shrink-0 rounded-md object-cover ring-1 ring-foreground/10"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{state.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {state.source.type === "demo" ? "Sample" : "Upload"}
                      {uses > 0 ? ` · on the reel ${uses === 1 ? "once" : `${uses} times`}` : " · not on the reel"}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button type="button" size="xs" variant="secondary" onClick={() => onAdd(state.id)}>
                      Add
                    </Button>
                    {state.source.type === "upload" ? (
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="ghost"
                        aria-label={`Delete ${state.name}`}
                        onClick={() => onDelete(state.id)}
                      >
                        <Trash2 />
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div className="border-t px-4 py-3">
        <Button type="button" variant="ghost" size="sm" onClick={onRestore}>
          Restore sample reel
        </Button>
      </div>
    </div>
  );
}

function Preview({
  canvasRef,
  empty,
  loading,
  imageError,
  segmentLabel,
  onRestore,
  onRetry,
}: {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  empty: boolean;
  loading: boolean;
  imageError: string | null;
  segmentLabel: string;
  onRestore: () => void;
  onRetry: () => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center gap-3 px-4 py-4">
      <div className="relative w-full max-w-[280px] sm:max-w-[320px]">
        <div className="rounded-[2rem] bg-foreground p-2 shadow-xl">
          <div className="relative aspect-[9/16] overflow-hidden rounded-[1.4rem] bg-[#1c1915]">
            {empty ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-5 text-center text-background">
                <p className="text-base font-medium">The reel is empty</p>
                <p className="text-sm text-background/75">
                  Add two screens. The Fieldnote samples can play a container transform before you upload anything.
                </p>
                <Button type="button" variant="secondary" onClick={onRestore}>
                  Use the sample reel
                </Button>
              </div>
            ) : (
              <canvas ref={canvasRef} className="h-full w-full" aria-label="Transition preview" />
            )}
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-[#1c1915]/80 text-sm text-white">
                Loading screens…
              </div>
            ) : null}
            {imageError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#1c1915] px-5 text-center text-sm text-white">
                <p>{imageError}</p>
                <Button type="button" variant="secondary" onClick={onRetry}>
                  Try again
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{empty ? "No cut yet" : segmentLabel}</p>
    </div>
  );
}

function Inspector({
  project,
  state,
  transition,
  fromName,
  toName,
  sameFullContainer,
  onState,
  onTransition,
  onMove,
  onRemove,
}: {
  project: Project;
  state: ScreenState | undefined;
  transition: TransitionConfig | undefined;
  fromName?: string;
  toName?: string;
  sameFullContainer: boolean;
  onState: (patch: Partial<ScreenState>) => void;
  onTransition: (next: TransitionConfig) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}) {
  return (
    <div className="h-full min-h-0 overflow-auto px-4 py-4">
      {project.order.length === 0 ? (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold">Motion</h2>
          <p className="text-sm text-muted-foreground">
            Put at least two states on the reel. Then pick the gap between them and choose a Material pattern.
          </p>
        </div>
      ) : null}

      {state ? (
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold">{state.name}</h2>
            <p className="text-xs text-muted-foreground">
              A still state. The hold is time on screen, not a motion token.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="state-name">Name</Label>
            <Input
              id="state-name"
              value={state.name}
              maxLength={48}
              onChange={(event) => onState({ name: event.target.value })}
            />
          </div>
          <TokenField
            label="Hold"
            value={String(state.holdMs)}
            options={HOLD_MS.map((ms) => ({ value: String(ms), label: `${ms}ms still` }))}
            onChange={(value) => onState({ holdMs: Number(value) as HoldMs })}
          />
          <p className="text-[11px] text-muted-foreground">Still hold. Not a motion token.</p>
          <TokenField
            label="Container region"
            token={
              state.container === "full"
                ? "Full bleed, corner radius 0"
                : "md.sys.shape.corner.large · 16dp"
            }
            value={state.container}
            options={CONTAINER_PRESETS.map((preset) => ({
              value: preset,
              label: CONTAINER_LABEL[preset],
            }))}
            onChange={(value) => onState({ container: value as ContainerPreset })}
          />
          <p className="text-xs text-muted-foreground">
            Container transform morphs this region into the next state’s region. Row matches the Harbor card on the Sites sample.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onMove(-1)}>
              Earlier
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => onMove(1)}>
              Later
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
              Remove from reel
            </Button>
          </div>
        </div>
      ) : null}

      {transition && fromName && toName ? (
        <TransitionEditor
          transition={transition}
          fromName={fromName}
          toName={toName}
          sameFullContainer={sameFullContainer}
          onTransition={onTransition}
        />
      ) : null}

      {project.order.length === 1 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          One state can hold, but a cut needs a second screen.
        </p>
      ) : null}
    </div>
  );
}

function TransitionEditor({
  transition,
  fromName,
  toName,
  sameFullContainer,
  onTransition,
}: {
  transition: TransitionConfig;
  fromName: string;
  toName: string;
  sameFullContainer: boolean;
  onTransition: (next: TransitionConfig) => void;
}) {
  const copy = patternCopy(transition.pattern);
  const lines = describeTransition(transition);
  const driver = transition.driver;

  function setPattern(pattern: PatternId) {
    onTransition({
      ...transition,
      pattern,
      driver: driver.kind === "spring" ? springDriverFor(pattern) : specDriver(pattern),
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-muted-foreground">
          {fromName} → {toName}
        </p>
        <h2 className="text-sm font-semibold">{copy.title}</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{copy.body}</p>
      </div>

      <TokenField
        label="Pattern"
        value={transition.pattern}
        options={PATTERN_IDS.map((id) => ({ value: id, label: PATTERN_LABEL[id] }))}
        onChange={(value) => setPattern(value as PatternId)}
      />
      <p className="text-[11px] text-muted-foreground">
        Changing the pattern loads its published token pairing.
      </p>

      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={driver.kind === "easing" ? "default" : "outline"}
          onClick={() => onTransition({ ...transition, driver: specDriver(transition.pattern) })}
        >
          Easing + duration
        </Button>
        <Button
          type="button"
          size="sm"
          variant={driver.kind === "spring" ? "default" : "outline"}
          onClick={() => onTransition({ ...transition, driver: springDriverFor(transition.pattern) })}
        >
          Spring
        </Button>
      </div>

      {transition.pattern === "shared-axis" ? (
        <div className="space-y-3">
          <TokenField
            label="Axis"
            token="MaterialSharedAxis"
            value={transition.axis}
            options={[
              { value: "x", label: "X · horizontal" },
              { value: "y", label: "Y · vertical" },
              { value: "z", label: "Z · scale" },
            ]}
            onChange={(value) =>
              onTransition({ ...transition, axis: value as TransitionConfig["axis"] })
            }
          />
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={transition.forward ? "default" : "outline"}
              onClick={() => onTransition({ ...transition, forward: true })}
            >
              Forward
            </Button>
            <Button
              type="button"
              size="sm"
              variant={!transition.forward ? "default" : "outline"}
              onClick={() => onTransition({ ...transition, forward: false })}
            >
              Backward
            </Button>
          </div>
        </div>
      ) : null}

      {driver.kind === "easing" && transition.pattern === "fade" ? (
        <FadeTokens driver={driver} onDriver={(next) => onTransition({ ...transition, driver: next })} />
      ) : null}

      {driver.kind === "easing" && transition.pattern !== "fade" ? (
        <div className="space-y-3">
          <TokenField
            label="Easing"
            token={EASINGS[driver.easing].token}
            value={driver.easing}
            options={easingOptions()}
            onChange={(value) =>
              onTransition({
                ...transition,
                driver: { ...driver, easing: value as EasingDriver["easing"] },
              })
            }
          />
          <TokenField
            label="Duration"
            token={DURATIONS[driver.duration].token}
            value={driver.duration}
            options={durationOptions()}
            onChange={(value) =>
              onTransition({
                ...transition,
                driver: { ...driver, duration: value as EasingDriver["duration"] },
              })
            }
          />
        </div>
      ) : null}

      {driver.kind === "spring" ? (
        <div className="space-y-3">
          <TokenField
            label="Scheme"
            token="Applied to md.sys.motion.spring.*"
            value={driver.scheme}
            options={SCHEMES.map((scheme) => ({
              value: scheme,
              label: scheme === "expressive" ? "Expressive" : "Standard",
            }))}
            onChange={(value) =>
              onTransition({
                ...transition,
                driver: { ...driver, scheme: value as typeof driver.scheme },
              })
            }
          />
          <TokenField
            label="Speed"
            token={`md.sys.motion.spring.${driver.speed}.spatial`}
            value={driver.speed}
            options={SPRING_SPEEDS.map((speed) => ({
              value: speed,
              label: speed === "default" ? "Default" : speed === "fast" ? "Fast" : "Slow",
            }))}
            onChange={(value) =>
              onTransition({
                ...transition,
                driver: { ...driver, speed: value as typeof driver.speed },
              })
            }
          />
          <p className="text-xs text-muted-foreground">
            Slow is the spec’s speed for full-screen motion. Fast is for small components. Opacity uses the matching effects spring so color and alpha do not bounce.
          </p>
        </div>
      ) : null}

      {transition.pattern === "container-transform" && sameFullContainer ? (
        <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
          Both states are full-bleed, so the container has nowhere to travel. Set the outgoing state to List row or Card to see the morph.
        </p>
      ) : null}

      <div>
        <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Tokens in this cut
        </h3>
        <ul className="space-y-3">
          {lines.map((line) => (
            <li key={`${line.role}-${line.token}`} className="rounded-lg border bg-card px-3 py-2">
              <p className="text-xs text-muted-foreground">{line.role}</p>
              <p className="mt-1 font-mono text-[11px] leading-snug break-all">{line.token}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{line.detail}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-1 text-xs text-muted-foreground">
        <p>Export is 720×1280, 30fps, H.264, up to 8 seconds.</p>
        <p>
          <a className="underline" href="https://m3.material.io/styles/motion/overview/how-it-works">
            Motion physics
          </a>
          {" · "}
          <a className="underline" href="https://m3.material.io/styles/motion/easing-and-duration/tokens-specs">
            Easing and duration tokens
          </a>
          {" · "}
          <a className="underline" href="https://m3.material.io/styles/motion/transitions/transition-patterns">
            Transition patterns
          </a>
        </p>
      </div>
    </div>
  );
}

function FadeTokens({
  driver,
  onDriver,
}: {
  driver: EasingDriver;
  onDriver: (driver: EasingDriver) => void;
}) {
  return (
    <div className="space-y-3">
      <TokenField
        label="Incoming easing"
        token={EASINGS[driver.incomingEasing].token}
        value={driver.incomingEasing}
        options={easingOptions()}
        onChange={(value) => onDriver({ ...driver, incomingEasing: value as EasingDriver["incomingEasing"] })}
      />
      <TokenField
        label="Incoming duration"
        token={DURATIONS[driver.incomingDuration].token}
        value={driver.incomingDuration}
        options={durationOptions()}
        onChange={(value) =>
          onDriver({ ...driver, incomingDuration: value as EasingDriver["incomingDuration"] })
        }
      />
      <TokenField
        label="Outgoing easing"
        token={EASINGS[driver.outgoingEasing].token}
        value={driver.outgoingEasing}
        options={easingOptions()}
        onChange={(value) => onDriver({ ...driver, outgoingEasing: value as EasingDriver["outgoingEasing"] })}
      />
      <TokenField
        label="Outgoing duration"
        token={DURATIONS[driver.outgoingDuration].token}
        value={driver.outgoingDuration}
        options={durationOptions()}
        onChange={(value) =>
          onDriver({ ...driver, outgoingDuration: value as EasingDriver["outgoingDuration"] })
        }
      />
    </div>
  );
}

function Timeline({
  project,
  selection,
  playhead,
  durationMs,
  playing,
  segmentLabel,
  onSelect,
  onPlayhead,
  onTogglePlay,
  onRestart,
  onClear,
}: {
  project: Project;
  selection: Selection;
  playhead: number;
  durationMs: number;
  playing: boolean;
  segmentLabel: string;
  onSelect: (selection: Selection) => void;
  onPlayhead: (value: number) => void;
  onTogglePlay: () => void;
  onRestart: () => void;
  onClear: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="icon"
          variant="secondary"
          aria-label={playing ? "Pause" : "Play"}
          disabled={durationMs <= 0}
          onClick={onTogglePlay}
        >
          {playing ? <Pause /> : <Play />}
        </Button>
        <Button type="button" size="icon" variant="ghost" aria-label="Back to start" onClick={onRestart}>
          <RotateCcw />
        </Button>
        <div className="min-w-0 flex-1">
          <input
            aria-label="Playhead"
            type="range"
            min={0}
            max={Math.max(durationMs, 1)}
            step={1000 / 30}
            value={Math.min(playhead, Math.max(durationMs, 1))}
            disabled={durationMs <= 0}
            onChange={(event) => onPlayhead(Number(event.target.value))}
            className="w-full accent-primary"
          />
        </div>
        <p className="w-28 text-right font-mono text-xs text-muted-foreground">
          {formatSeconds(playhead)} / {formatSeconds(durationMs)}
        </p>
        <Button type="button" variant="ghost" size="sm" onClick={onClear} disabled={project.order.length === 0}>
          Clear reel
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{segmentLabel}</p>
      <div className="flex items-stretch gap-2 overflow-x-auto pb-1">
        {project.order.length === 0 ? (
          <p className="text-sm text-muted-foreground">The timeline is waiting for two states.</p>
        ) : null}
        {project.order.map((id, index) => {
          const state = stateById(project, id);
          const transition = project.transitions[index];
          const selected = selection.kind === "state" && selection.index === index;
          return (
            <div key={`${id}-${index}`} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onSelect({ kind: "state", index })}
                className={`w-28 shrink-0 rounded-xl border p-2 text-left ${selected ? "border-primary bg-primary/5" : "bg-card"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={state ? screenSrc(state) : ""}
                  alt=""
                  className="mb-2 h-14 w-full rounded-md object-cover"
                />
                <span className="block truncate text-sm font-medium">{state?.name}</span>
                <span className="font-mono text-[10px] text-muted-foreground">{state?.holdMs}ms hold</span>
              </button>
              {transition ? (
                <button
                  type="button"
                  onClick={() => onSelect({ kind: "transition", index })}
                  className={`w-28 shrink-0 rounded-xl border px-2 py-2 text-left text-xs ${
                    selection.kind === "transition" && selection.index === index
                      ? "border-primary bg-primary/5"
                      : "bg-muted/50"
                  }`}
                >
                  <span className="block font-medium">{PATTERN_LABEL[transition.pattern]}</span>
                  <span className="mt-1 block font-mono text-[10px] text-muted-foreground">
                    {transitionDurationMs(transition)}ms
                  </span>
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
