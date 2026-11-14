import path from "node:path";
import { loadImage, type Image } from "@napi-rs/canvas";
import { ExportError, encodeProjectMp4 } from "@/lib/render/encode-mp4";
import { parseProject } from "@/lib/motion/parse";
import { STAGE, stateById } from "@/lib/motion/project";
import { buildTimeline } from "@/lib/motion/timeline";

export async function POST(request: Request) {
  try {
    const project = parseProject(await request.json());
    if (project.order.length < 2) {
      throw new ExportError("Add at least two states to the reel before exporting.");
    }
    const timeline = buildTimeline(project);
    if (timeline.durationMs > STAGE.maxExportMs) {
      throw new ExportError(
        `This reel is ${(timeline.durationMs / 1000).toFixed(1)}s. Export stops at 8 seconds. Shorten a hold or pick a faster token.`,
      );
    }

    const images = new Map<string, Image>();
    for (const id of new Set(project.order)) {
      const state = stateById(project, id);
      if (!state) throw new ExportError("A state on the reel is missing.");
      if (state.source.type === "demo") {
        images.set(
          id,
          await loadImage(path.join(process.cwd(), "public", "demo", `${state.source.demo}.png`)),
        );
      } else {
        const base64 = state.source.dataUrl.split(",")[1] ?? "";
        images.set(id, await loadImage(Buffer.from(base64, "base64")));
      }
    }

    const mp4 = await encodeProjectMp4(project, images);
    return new Response(new Uint8Array(mp4), {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": 'attachment; filename="microcut.mp4"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Export failed.";
    const status = error instanceof ExportError ? error.status : 400;
    return Response.json({ error: message }, { status });
  }
}
