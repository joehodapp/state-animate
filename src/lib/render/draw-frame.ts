import type { Layer } from "../motion/patterns";
import { EXPORT_HEIGHT, EXPORT_WIDTH, STAGE } from "../motion/project";

export type Drawable = CanvasImageSource & {
  width: number;
  height: number;
};

export function drawCover(
  ctx: CanvasRenderingContext2D,
  image: Drawable,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
) {
  if (dw <= 0 || dh <= 0 || image.width <= 0 || image.height <= 0) return;
  const imageRatio = image.width / image.height;
  const destRatio = dw / dh;
  let sx = 0;
  let sy = 0;
  let sw = image.width;
  let sh = image.height;
  if (imageRatio > destRatio) {
    sw = image.height * destRatio;
    sx = (image.width - sw) / 2;
  } else {
    sh = image.width / destRatio;
    sy = (image.height - sh) / 2;
  }
  ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  layers: Layer[],
  images: Map<string, Drawable>,
  density = STAGE.density,
) {
  const width = STAGE.widthDp * density;
  const height = STAGE.heightDp * density;
  ctx.clearRect(0, 0, width, height);
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#1c1915";
  ctx.fillRect(0, 0, width, height);

  for (const layer of layers) {
    if (layer.alpha <= 0.001) continue;
    const image = images.get(layer.stateId);
    if (!image) continue;
    ctx.save();
    ctx.globalAlpha = Math.min(1, Math.max(0, layer.alpha));
    if (layer.clip) {
      const x = layer.clip.x * density;
      const y = layer.clip.y * density;
      const w = Math.max(1, layer.clip.w * density);
      const h = Math.max(1, layer.clip.h * density);
      const radius = Math.max(0, layer.clip.r * density);
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, radius);
      ctx.clip();
      drawCover(ctx, image, x, y, w, h);
    } else {
      const cx = width / 2 + layer.dx * density;
      const cy = height / 2 + layer.dy * density;
      ctx.translate(cx, cy);
      ctx.scale(layer.scale, layer.scale);
      ctx.translate(-width / 2, -height / 2);
      drawCover(ctx, image, 0, 0, width, height);
    }
    ctx.restore();
  }
}

export const FRAME_SIZE = { width: EXPORT_WIDTH, height: EXPORT_HEIGHT };
