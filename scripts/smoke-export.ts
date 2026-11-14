import { writeFile } from "node:fs/promises";
import { loadImage } from "@napi-rs/canvas";
import { createDefaultProject } from "../src/lib/motion/project";
import { encodeProjectMp4 } from "../src/lib/render/encode-mp4";

async function main() {
  const project = createDefaultProject();
  const images = new Map();
  images.set("sites", await loadImage("public/demo/sites.png"));
  images.set("harbor", await loadImage("public/demo/harbor.png"));
  const mp4 = await encodeProjectMp4(project, images);
  await writeFile("/tmp/microcut-smoke.mp4", mp4);
  console.log(`wrote /tmp/microcut-smoke.mp4 (${mp4.length} bytes)`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
