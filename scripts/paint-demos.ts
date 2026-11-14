import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createCanvas } from "@napi-rs/canvas";
import { paintDemo } from "../src/lib/demo/paint";
import { DEMO_IDS, EXPORT_HEIGHT, EXPORT_WIDTH } from "../src/lib/motion/project";

async function main() {
  const directory = path.join(process.cwd(), "public", "demo");
  await mkdir(directory, { recursive: true });

  for (const demo of DEMO_IDS) {
    const canvas = createCanvas(EXPORT_WIDTH, EXPORT_HEIGHT);
    const ctx = canvas.getContext("2d");
    paintDemo(ctx as unknown as CanvasRenderingContext2D, demo);
    const png = await canvas.encode("png");
    const file = path.join(directory, `${demo}.png`);
    await writeFile(file, png);
    console.log(`wrote ${file}`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
