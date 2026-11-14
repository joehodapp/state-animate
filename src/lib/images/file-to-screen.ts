import { drawCover } from "../render/draw-frame";
import { EXPORT_HEIGHT, EXPORT_WIDTH } from "../motion/project";

const TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export async function fileToScreen(file: File): Promise<string> {
  if (!TYPES.has(file.type)) {
    throw new Error("Upload a PNG, JPEG, or WebP.");
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("That image is larger than 8MB. Export a smaller screenshot and try again.");
  }
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = EXPORT_WIDTH;
  canvas.height = EXPORT_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("This browser could not read that image.");
  }
  drawCover(ctx, bitmap, 0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.86);
}

export function nameFromFile(file: File): string {
  const base = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
  return base.slice(0, 48) || "Uploaded screen";
}
