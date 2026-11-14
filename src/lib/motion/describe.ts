import {
  CONTAINER_FADE_END,
  CONTAINER_SHAPE_END,
  FADE_IN_SCALE,
  FADE_INCOMING_END,
  FADE_THROUGH_IN_SCALE,
  FADE_THROUGH_THRESHOLD,
  SHARED_AXIS_IN_SCALE,
  SHARED_AXIS_OUT_SCALE,
  SHARED_AXIS_SLIDE_DP,
  transitionDurationMs,
} from "./patterns";
import { SHAPE_CORNER_LARGE_DP, type TransitionConfig } from "./project";
import { schemeSettleMs } from "./spring";
import { DURATIONS, EASINGS, springToken } from "./tokens";

export type TokenLine = {
  role: string;
  token: string;
  detail: string;
};

const PATTERN_COPY: Record<TransitionConfig["pattern"], { title: string; body: string }> = {
  "container-transform": {
    title: "Container transform",
    body: "The persistent container morphs from the outgoing state's region into the incoming state's region. Incoming content uses FADE_MODE_IN, so it fades in while the shape is still moving. This is the pattern for a list row or card opening into a detail.",
  },
  "shared-axis": {
    title: "Shared axis",
    body: "Both screens travel together on X, Y, or Z. Forward and backward are the hierarchy pair; a lateral move is the same slide without implying a level change. Opacity uses a fade-through so the screens do not cross in the middle.",
  },
  "fade-through": {
    title: "Fade through",
    body: "Top-level destinations that are not spatially related. The outgoing screen finishes fading out before the incoming screen fades in, with a slight scale on the way in.",
  },
  fade: {
    title: "Fade",
    body: "Enter and exit inside the screen bounds. Incoming content fades and scales up. Outgoing content fades without scaling, on a shorter accelerate curve.",
  },
};

export function patternCopy(pattern: TransitionConfig["pattern"]): { title: string; body: string } {
  return PATTERN_COPY[pattern];
}

export function describeTransition(config: TransitionConfig): TokenLine[] {
  const lines: TokenLine[] = [];
  const driver = config.driver;

  if (driver.kind === "easing") {
    if (config.pattern === "fade") {
      const incoming = EASINGS[driver.incomingEasing];
      const outgoing = EASINGS[driver.outgoingEasing];
      const inDur = DURATIONS[driver.incomingDuration];
      const outDur = DURATIONS[driver.outgoingDuration];
      lines.push(
        {
          role: "Incoming easing",
          token: incoming.token,
          detail: `${incoming.detail} MaterialFade incoming theme attr motionEasingEmphasizedDecelerateInterpolator.`,
        },
        {
          role: "Incoming duration",
          token: inDur.token,
          detail: `${inDur.ms}ms. Theme attr motionDurationMedium4.`,
        },
        {
          role: "Outgoing easing",
          token: outgoing.token,
          detail: `${outgoing.detail} Theme attr motionEasingEmphasizedAccelerateInterpolator.`,
        },
        {
          role: "Outgoing duration",
          token: outDur.token,
          detail: `${outDur.ms}ms. Theme attr motionDurationShort3. The reel holds the longer of the two.`,
        },
      );
    } else {
      const easing = EASINGS[driver.easing];
      const duration = DURATIONS[driver.duration];
      const durationAttr =
        config.pattern === "container-transform"
          ? "The duration token page pairs a card expanding to full screen with long2 and emphasized."
          : "Theme attr motionDurationLong1 on MaterialSharedAxis and MaterialFadeThrough.";
      lines.push(
        {
          role: "Easing",
          token: easing.token,
          detail: easing.detail,
        },
        {
          role: "Duration",
          token: duration.token,
          detail: `${duration.ms}ms. ${durationAttr}`,
        },
      );
    }
  } else {
    const spatial = springToken(driver.scheme, driver.speed, "spatial");
    const effects = springToken(driver.scheme, driver.speed, "effects");
    const spatialSettle = schemeSettleMs(driver.scheme, driver.speed, "spatial");
    const effectsSettle = schemeSettleMs(driver.scheme, driver.speed, "effects");
    lines.push({
      role: "Motion scheme",
      token: driver.scheme,
      detail:
        "The scheme is chosen for this transition and applied to every spring token. It is not part of the token name. Expressive overshoots. Standard keeps bounce small. Initial velocity is 0.",
    });
    if (config.pattern !== "fade") {
      lines.push({
        role: "Spatial spring",
        token: spatial.token,
        detail: `Damping ${spatial.damping}, stiffness ${spatial.stiffness}. Settles in ${spatialSettle}ms. Drives translation, scale, and container bounds.`,
      });
    } else {
      lines.push({
        role: "Spatial spring",
        token: spatial.token,
        detail: `Damping ${spatial.damping}, stiffness ${spatial.stiffness}. Settles in ${spatialSettle}ms. Drives the incoming scale only. Opacity does not use a spatial spring.`,
      });
    }
    lines.push({
      role: "Effects spring",
      token: effects.token,
      detail: `Damping ${effects.damping}, stiffness ${effects.stiffness}. Settles in ${effectsSettle}ms. Drives opacity, which must not overshoot.`,
    });
  }

  if (config.pattern === "container-transform") {
    lines.push(
      {
        role: "Fade mode",
        token: "MaterialContainerTransform.FADE_MODE_IN",
        detail: `Incoming opacity runs over progress 0–${CONTAINER_FADE_END}. Outgoing opacity stays 1 underneath the growing container.`,
      },
      {
        role: "Shape mask",
        token: "MaterialContainerTransform enter thresholds",
        detail: `Corner radius completes at progress ${CONTAINER_SHAPE_END}. Bounds use the full spatial progress and may overshoot when a spatial spring does.`,
      },
      {
        role: "Corner",
        token: "md.sys.shape.corner.large",
        detail: `${SHAPE_CORNER_LARGE_DP}dp on row and card containers, 0 on full-bleed.`,
      },
    );
  }

  if (config.pattern === "shared-axis") {
    lines.push(
      {
        role: "Axis",
        token: `MaterialSharedAxis.${config.axis.toUpperCase()}`,
        detail: config.forward
          ? "Forward. On X the screens slide left, on Y they slide up, on Z they scale outward."
          : "Backward. The slide or scale is reversed.",
      },
      {
        role: "Slide distance",
        token: "mtrl_transition_shared_axis_slide_distance",
        detail:
          config.axis === "z"
            ? `Z uses ScaleProvider: incoming ${SHARED_AXIS_IN_SCALE} → 1, outgoing 1 → ${SHARED_AXIS_OUT_SCALE} when forward.`
            : `${SHARED_AXIS_SLIDE_DP}dp. The slide runs on spatial progress while opacity uses the fade-through split.`,
      },
      {
        role: "Fade through",
        token: "FadeThroughProvider.FADE_THROUGH_THRESHOLD",
        detail: `${FADE_THROUGH_THRESHOLD}. Outgoing opacity ends at this progress. Incoming opacity starts here. MaterialSharedAxis uses this as its secondary animator.`,
      },
    );
  }

  if (config.pattern === "fade-through") {
    lines.push(
      {
        role: "Threshold",
        token: "FadeThroughProvider.FADE_THROUGH_THRESHOLD",
        detail: `${FADE_THROUGH_THRESHOLD}. The outgoing screen is gone before the incoming screen appears.`,
      },
      {
        role: "Incoming scale",
        token: "MaterialFadeThrough.DEFAULT_START_SCALE",
        detail: `${FADE_THROUGH_IN_SCALE} → 1 on spatial progress. scaleOnDisappear is false, so the outgoing screen does not scale.`,
      },
    );
  }

  if (config.pattern === "fade") {
    lines.push(
      {
        role: "Incoming fade",
        token: "FadeProvider incoming end threshold",
        detail: `${FADE_INCOMING_END}. Opacity reaches 1 at this progress, then holds.`,
      },
      {
        role: "Incoming scale",
        token: "MaterialFade.DEFAULT_START_SCALE",
        detail: `${FADE_IN_SCALE} → 1. The outgoing screen does not scale.`,
      },
    );
  }

  lines.push({
    role: "Transition length",
    token: `${transitionDurationMs(config)}ms`,
    detail:
      driver.kind === "spring"
        ? "Springs have no duration token. The length is the settle time of the springs this pattern uses."
        : "Sum of the duration tokens this pattern plays. Holds before and after are still frames, not motion tokens.",
  });

  return lines;
}
