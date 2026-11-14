import { CONTAINERS, EXPORT_HEIGHT, EXPORT_WIDTH, type DemoId } from "../motion/project";

type PaintContext = CanvasRenderingContext2D;

const W = EXPORT_WIDTH;
const H = EXPORT_HEIGHT;

function dp(value: number): number {
  return value * 2;
}

function round(
  ctx: PaintContext,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}

function type(weight: number, sizeDp: number): string {
  return `${weight} ${Math.round(sizeDp * 2)}px Inter`;
}

function text(
  ctx: PaintContext,
  value: string,
  x: number,
  y: number,
  font: string,
  color: string,
) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textBaseline = "top";
  ctx.fillText(value, x, y);
}

function statusBar(ctx: PaintContext, ink: string) {
  text(ctx, "9:41", dp(20), dp(16), type(600, 13), ink);
  text(ctx, "LTE", dp(292), dp(16), type(500, 12), ink);
}

function homeIndicator(ctx: PaintContext, color: string) {
  round(ctx, dp(128), dp(624), dp(104), dp(5), dp(3), color);
}

function nav(
  ctx: PaintContext,
  active: "Sites" | "Today" | "Notes",
  ink: string,
  muted: string,
) {
  round(ctx, 0, dp(576), W, dp(64), 0, "#fffdf8");
  ctx.fillStyle = "#e6dfd2";
  ctx.fillRect(0, dp(576), W, 2);
  const items = ["Sites", "Today", "Notes"] as const;
  items.forEach((item, index) => {
    const x = dp(48 + index * 110);
    text(ctx, item, x, dp(598), type(600, 13), item === active ? ink : muted);
  });
}

function paintSites(ctx: PaintContext) {
  ctx.fillStyle = "#f3efe6";
  ctx.fillRect(0, 0, W, H);
  statusBar(ctx, "#1c1915");
  text(ctx, "FIELDNOTE", dp(20), dp(52), type(600, 11), "#1f6f6a");
  text(ctx, "Sites", dp(20), dp(72), type(560, 28), "#1c1915");
  text(
    ctx,
    "Four places still open on the coast range.",
    dp(20),
    dp(116),
    type(400, 14),
    "#6b645b",
  );

  const rows = [
    {
      title: "Harbor mouth",
      meta: "Open shore · tide 1.4m",
      swatch: "#1f6f6a",
      emphasis: true,
    },
    {
      title: "Ridge kiln",
      meta: "Inland · clay still wet",
      swatch: "#b45309",
      emphasis: false,
    },
    {
      title: "Salt meadow",
      meta: "Birds along the west edge",
      swatch: "#4d7c0f",
      emphasis: false,
    },
    {
      title: "Night pier",
      meta: "Lights after 18:00",
      swatch: "#1e3a5f",
      emphasis: false,
    },
  ];

  rows.forEach((row, index) => {
    const y = dp(CONTAINERS.row.y + index * 98);
    const x = dp(CONTAINERS.row.x);
    const w = dp(CONTAINERS.row.w);
    const h = dp(CONTAINERS.row.h);
    round(ctx, x, y, w, h, dp(16), row.emphasis ? "#fffdf8" : "#efeae0");
    round(ctx, x, y, dp(6), h, dp(3), row.swatch);
    text(ctx, row.title, x + dp(22), y + dp(20), type(600, 16), "#1c1915");
    text(ctx, row.meta, x + dp(22), y + dp(46), type(400, 12), "#6b645b");
    text(ctx, "›", x + w - dp(28), y + dp(26), type(400, 18), "#8a8175");
  });

  nav(ctx, "Sites", "#1f6f6a", "#8a8175");
  homeIndicator(ctx, "#1c1915");
}

function paintHarbor(ctx: PaintContext) {
  const sky = ctx.createLinearGradient(0, 0, 0, dp(340));
  sky.addColorStop(0, "#8fd0c6");
  sky.addColorStop(0.45, "#1f6f6a");
  sky.addColorStop(1, "#143f44");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  ctx.beginPath();
  ctx.fillStyle = "#f2d48a";
  ctx.arc(dp(286), dp(78), dp(22), 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#0f3a38";
  ctx.beginPath();
  ctx.moveTo(0, dp(250));
  ctx.quadraticCurveTo(dp(90), dp(180), dp(180), dp(230));
  ctx.quadraticCurveTo(dp(250), dp(268), dp(360), dp(200));
  ctx.lineTo(dp(360), dp(320));
  ctx.lineTo(0, dp(320));
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#0b2e33";
  ctx.fillRect(0, dp(300), W, dp(40));

  statusBar(ctx, "#f7fffc");
  text(ctx, "‹  Sites", dp(20), dp(48), type(600, 15), "#f7fffc");

  const sheetTop = dp(292);
  ctx.beginPath();
  ctx.moveTo(0, dp(328));
  ctx.lineTo(0, H);
  ctx.lineTo(W, H);
  ctx.lineTo(W, dp(328));
  ctx.quadraticCurveTo(W, sheetTop, W - dp(36), sheetTop);
  ctx.lineTo(dp(36), sheetTop);
  ctx.quadraticCurveTo(0, sheetTop, 0, dp(328));
  ctx.closePath();
  ctx.fillStyle = "#fffdf8";
  ctx.fill();

  text(ctx, "HARBOR MOUTH", dp(20), dp(312), type(600, 11), "#1f6f6a");
  text(ctx, "Low tide, cobble showing", dp(20), dp(332), type(560, 22), "#1c1915");

  const chips = ["Tide 1.4m", "Wind NW 12kt", "Cobble"];
  let chipX = dp(20);
  chips.forEach((chip) => {
    const width = dp(20) + chip.length * dp(7.6);
    round(ctx, chipX, dp(388), width, dp(28), dp(14), "#e7f3f1");
    text(ctx, chip, chipX + dp(10), dp(394), type(500, 12), "#135e59");
    chipX += width + dp(8);
  });

  const body = [
    "The bar is exposed for another hour.",
    "Log the wrack line before the turn.",
    "Yesterday’s stake is still on the spit.",
  ];
  body.forEach((line, index) => {
    text(ctx, line, dp(20), dp(440) + index * 44, type(400, 15), "#3f3a34");
  });

  round(ctx, dp(20), dp(560), dp(320), dp(48), dp(14), "#1f6f6a");
  text(ctx, "Log a visit", dp(118), dp(574), type(600, 16), "#f7fffc");
  homeIndicator(ctx, "#cfc6b8");
}

function paintToday(ctx: PaintContext) {
  ctx.fillStyle = "#f3efe6";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#243128";
  ctx.fillRect(0, 0, W, dp(228));
  statusBar(ctx, "#f4f1ea");
  text(ctx, "FIELDNOTE", dp(20), dp(52), type(600, 11), "#b7d7c8");
  text(ctx, "Today", dp(20), dp(74), type(560, 28), "#f7f4ee");
  text(ctx, "Saturday, November 14", dp(20), dp(122), type(400, 15), "#d5ddd4");
  text(ctx, "Three visits, one open hour at dusk.", dp(20), dp(152), type(400, 14), "#d5ddd4");

  const cards = [
    { time: "07:40", title: "Harbor mouth", note: "Log the tide line before the bar covers." },
    { time: "11:10", title: "Ridge kiln", note: "Take the clay sample from the north wall." },
    { time: "15:30", title: "Salt meadow", note: "Count the birds on the west edge." },
  ];

  cards.forEach((card, index) => {
    const y = dp(252 + index * 100);
    round(ctx, dp(16), y, dp(328), dp(88), dp(16), "#fffdf8");
    text(ctx, card.time, dp(32), y + dp(18), type(600, 13), "#1f6f6a");
    text(ctx, card.title, dp(100), y + dp(14), type(600, 16), "#1c1915");
    text(ctx, card.note, dp(100), y + dp(44), type(400, 12), "#6b645b");
  });

  nav(ctx, "Today", "#1f6f6a", "#8a8175");
  homeIndicator(ctx, "#1c1915");
}

export function paintDemo(ctx: PaintContext, demo: DemoId) {
  ctx.clearRect(0, 0, W, H);
  if (demo === "sites") paintSites(ctx);
  else if (demo === "harbor") paintHarbor(ctx);
  else paintToday(ctx);
}
