import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createCanvas, type Image } from "@napi-rs/canvas";
import { buildTimeline, sampleProject } from "../motion/timeline";
import { EXPORT_HEIGHT, EXPORT_WIDTH, STAGE, type Project } from "../motion/project";
import { drawFrame } from "./draw-frame";

export class ExportError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function ffmpegAvailable(): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("ffmpeg", ["-version"]);
    child.on("error", () => {
      reject(
        new ExportError(
          "ffmpeg is not available on this machine, so Microcut cannot encode an MP4.",
          500,
        ),
      );
    });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else {
        reject(new ExportError("ffmpeg did not start, so the MP4 could not be encoded.", 500));
      }
    });
  });
}

export async function encodeProjectMp4(
  project: Project,
  images: Map<string, Image>,
): Promise<Buffer> {
  await ffmpegAvailable();
  const timeline = buildTimeline(project);
  if (timeline.durationMs <= 0) {
    throw new ExportError("The reel is empty.");
  }

  const frames = Math.max(1, Math.round((timeline.durationMs / 1000) * STAGE.fps));
  const canvas = createCanvas(EXPORT_WIDTH, EXPORT_HEIGHT);
  const ctx = canvas.getContext("2d");
  const drawable = images as unknown as Map<string, CanvasImageSource & { width: number; height: number }>;

  const directory = await mkdtemp(path.join(tmpdir(), "microcut-"));
  const output = path.join(directory, "microcut.mp4");

  try {
    const buffer = await new Promise<Buffer>((resolve, reject) => {
      const child = spawn("ffmpeg", [
        "-y",
        "-f",
        "rawvideo",
        "-pix_fmt",
        "rgba",
        "-s",
        `${EXPORT_WIDTH}x${EXPORT_HEIGHT}`,
        "-r",
        String(STAGE.fps),
        "-i",
        "pipe:0",
        "-an",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-preset",
        "veryfast",
        "-crf",
        "20",
        "-movflags",
        "+faststart",
        output,
      ]);

      let stderr = "";
      child.stderr.on("data", (chunk: Buffer) => {
        stderr += chunk.toString();
        if (stderr.length > 8000) stderr = stderr.slice(-8000);
      });
      child.on("error", () => {
        reject(new ExportError("ffmpeg failed before it could write the MP4.", 500));
      });
      child.on("close", (code) => {
        if (code === 0) {
          resolve(readFile(output));
          return;
        }
        reject(
          new ExportError(
            `ffmpeg could not encode the MP4.${stderr ? ` ${stderr.trim().slice(-400)}` : ""}`,
            500,
          ),
        );
      });

      const writeFrames = async () => {
        for (let frame = 0; frame < frames; frame += 1) {
          const timeMs = Math.min(timeline.durationMs, (frame / STAGE.fps) * 1000);
          const sample = sampleProject(project, timeMs);
          drawFrame(ctx as unknown as CanvasRenderingContext2D, sample.layers, drawable, STAGE.density);
          const image = ctx.getImageData(0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);
          const raw = Buffer.from(image.data);
          const ok = child.stdin.write(raw);
          if (!ok) {
            await new Promise<void>((resume) => child.stdin.once("drain", () => resume()));
          }
        }
        child.stdin.end();
      };

      writeFrames().catch((error: unknown) => {
        child.kill();
        reject(error instanceof Error ? error : new ExportError("Frame render failed.", 500));
      });
    });
    return buffer;
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
