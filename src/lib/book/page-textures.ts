import * as THREE from "three";
import { AUTHOR, BOOK_TITLE, PAGES, WORK_TITLE, type PageSpec } from "./content";

export const PAGE_CANVAS_W = 1280;
export const PAGE_CANVAS_H = 1860;

export interface BookTextures {
  coverFront: THREE.CanvasTexture;
  coverBack: THREE.CanvasTexture;
  coverInside: THREE.CanvasTexture;
  spine: THREE.CanvasTexture;
  pages: THREE.CanvasTexture[];
  leafCount: number;
  spreadCount: number;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`failed ${src}`));
    img.src = src;
  });
}

function makeCanvas(w: number, h: number) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { alpha: false })!;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.direction = "ltr";
  return { canvas, ctx };
}

function toTex(canvas: HTMLCanvasElement) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.flipY = true;
  tex.needsUpdate = true;
  return tex;
}

function paintPaper(ctx: CanvasRenderingContext2D, paper: HTMLImageElement) {
  const { width: w, height: h } = ctx.canvas;
  ctx.drawImage(paper, 0, 0, w, h);
  ctx.fillStyle = "rgba(250, 240, 220, 0.42)";
  ctx.fillRect(0, 0, w, h);

  const g = ctx.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, "rgba(72, 48, 24, 0.08)");
  g.addColorStop(0.12, "rgba(72, 48, 24, 0.02)");
  g.addColorStop(0.92, "rgba(255, 248, 230, 0.04)");
  g.addColorStop(1, "rgba(40, 24, 10, 0.06)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function fleuron(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-42 * s, 0);
  ctx.lineTo(-11 * s, 0);
  ctx.moveTo(11 * s, 0);
  ctx.lineTo(42 * s, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -7 * s);
  ctx.lineTo(7 * s, 0);
  ctx.lineTo(0, 7 * s);
  ctx.lineTo(-7 * s, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function frame(ctx: CanvasRenderingContext2D) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  ctx.strokeStyle = "rgba(92, 58, 28, 0.32)";
  ctx.lineWidth = 1.4;
  ctx.strokeRect(64, 64, w - 128, h - 128);
  ctx.strokeStyle = "rgba(92, 58, 28, 0.16)";
  ctx.strokeRect(76, 76, w - 152, h - 152);
}

function folioMark(ctx: CanvasRenderingContext2D, spec: PageSpec, verso: boolean) {
  if (!spec.folio) return;
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  ctx.fillStyle = "rgba(72, 44, 22, 0.5)";
  ctx.font = "400 28px 'Shippori Mincho', serif";
  ctx.textAlign = "center";
  const x = verso ? w * 0.42 : w * 0.58;
  ctx.fillText(spec.folio, x, h - 96);
}

function paintPage(
  ctx: CanvasRenderingContext2D,
  paper: HTMLImageElement,
  spec: PageSpec,
  verso: boolean,
) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  paintPaper(ctx, paper);
  frame(ctx);
  ctx.fillStyle = "#1a0a04";
  ctx.textBaseline = "top";
  ctx.direction = "ltr";

  if (spec.kind === "title") {
    ctx.textAlign = "center";
    ctx.fillStyle = "#2e1a0c";
    ctx.font = "700 88px 'Shippori Mincho', serif";
    ctx.fillText(WORK_TITLE, w / 2, h * 0.36);
    fleuron(ctx, w / 2, h * 0.5, 1.2, "rgba(140, 96, 40, 0.75)");
    ctx.font = "500 44px 'Shippori Mincho', serif";
    ctx.fillStyle = "#4a2a14";
    ctx.fillText(AUTHOR, w / 2, h * 0.58);
    return;
  }

  if (spec.kind === "blank") {
    fleuron(ctx, w / 2, h * 0.5, 0.95, "rgba(120, 80, 36, 0.42)");
    return;
  }

  const gutter = 148;
  const outer = 118;
  const left = verso ? outer : gutter;
  let y = 160;
  ctx.textAlign = "left";

  if (spec.kind === "section" && spec.section) {
    ctx.textAlign = "center";
    ctx.font = "600 56px 'Shippori Mincho', serif";
    ctx.fillText(spec.section, w / 2, y);
    fleuron(ctx, w / 2, y + 84, 0.7, "rgba(120, 80, 36, 0.58)");
    y += 150;
    ctx.textAlign = "left";
  }

  if (spec.kind === "colophon") {
    fleuron(ctx, w / 2, 180, 0.9, "rgba(120, 80, 36, 0.5)");
    y = 250;
  }

  ctx.fillStyle = "#1a0a04";
  ctx.font = "500 46px 'Shippori Mincho', serif";
  const lh = 70;
  for (const line of spec.lines) {
    if (line === "") {
      y += lh * 0.5;
      continue;
    }
    ctx.fillText(line, left, y);
    y += lh;
  }
  folioMark(ctx, spec, verso);
}

function paintCover(
  img: HTMLImageElement,
  leather: HTMLImageElement,
  withTitle: boolean,
) {
  const w = 1024;
  const h = 1536;
  const { canvas, ctx } = makeCanvas(w, h);
  ctx.drawImage(img, 0, 0, w, h);
  if (withTitle) {
    const veil = ctx.createLinearGradient(0, h * 0.62, 0, h);
    veil.addColorStop(0, "rgba(40, 10, 8, 0)");
    veil.addColorStop(0.45, "rgba(40, 10, 8, 0.18)");
    veil.addColorStop(1, "rgba(24, 6, 4, 0.35)");
    ctx.fillStyle = veil;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#e4c57a";
    ctx.shadowColor = "rgba(40, 20, 4, 0.7)";
    ctx.shadowBlur = 14;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.direction = "ltr";
    ctx.font = "700 120px 'Shippori Mincho', serif";
    fleuron(ctx, w / 2, h * 0.76, 1.35, "rgba(201, 164, 76, 0.85)");
    ctx.fillText(BOOK_TITLE, w / 2, h * 0.86);
    ctx.shadowBlur = 0;
  } else {
    ctx.drawImage(leather, 0, 0, w, h);
    ctx.fillStyle = "rgba(40, 8, 6, 0.18)";
    ctx.fillRect(0, 0, w, h);
  }
  return toTex(canvas);
}

function paintSpine(leather: HTMLImageElement) {
  const w = 256;
  const h = 1536;
  const { canvas, ctx } = makeCanvas(w, h);
  ctx.drawImage(leather, 0, 0, w, h);
  ctx.fillStyle = "rgba(40, 8, 6, 0.2)";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#d4b36a";
  const band = (y: number) => {
    ctx.fillRect(18, y, w - 36, 14);
    ctx.fillRect(18, y + 22, w - 36, 4);
  };
  band(140);
  band(h - 180);
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.direction = "ltr";
  ctx.font = "700 88px 'Shippori Mincho', serif";
  ctx.fillText(BOOK_TITLE, 0, 0);
  ctx.restore();
  return toTex(canvas);
}

function paintInside(marble: HTMLImageElement) {
  const w = PAGE_CANVAS_W;
  const h = PAGE_CANVAS_H;
  const { canvas, ctx } = makeCanvas(w, h);
  ctx.drawImage(marble, 0, 0, w, h);
  ctx.fillStyle = "rgba(40, 16, 8, 0.08)";
  ctx.fillRect(0, 0, w, h);
  return toTex(canvas);
}

export async function makeBookTextures(): Promise<BookTextures> {
  await Promise.race([
    Promise.all([
      document.fonts.ready,
      document.fonts.load("700 88px 'Shippori Mincho'"),
      document.fonts.load("600 56px 'Shippori Mincho'"),
      document.fonts.load("500 46px 'Shippori Mincho'"),
      document.fonts.load("500 44px 'Shippori Mincho'"),
    ]),
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, 2400);
    }),
  ]);

  const [paper, marble, cover, leather] = await Promise.all([
    loadImage("/textures/paper.jpg"),
    loadImage("/textures/marble.jpg"),
    loadImage("/textures/cover.jpg"),
    loadImage("/textures/leather.jpg"),
  ]);

  const pages = PAGES.map((spec, i) => {
    const { canvas, ctx } = makeCanvas(PAGE_CANVAS_W, PAGE_CANVAS_H);
    paintPage(ctx, paper, spec, i % 2 === 1);
    return toTex(canvas);
  });

  const leafCount = Math.floor(pages.length / 2);
  const spreadCount = leafCount + 1;

  return {
    coverFront: paintCover(cover, leather, true),
    coverBack: paintCover(cover, leather, false),
    coverInside: paintInside(marble),
    spine: paintSpine(leather),
    pages,
    leafCount,
    spreadCount,
  };
}

export function leftOfSpread(
  pages: THREE.CanvasTexture[],
  inside: THREE.CanvasTexture,
  spread: number,
) {
  if (spread <= 0) return inside;
  return pages[spread * 2 - 1] ?? inside;
}

export function rightOfSpread(
  pages: THREE.CanvasTexture[],
  inside: THREE.CanvasTexture,
  spread: number,
  leafCount: number,
) {
  if (spread >= leafCount) return inside;
  return pages[spread * 2] ?? inside;
}

export function leafRecto(pages: THREE.CanvasTexture[], inside: THREE.CanvasTexture, leaf: number) {
  return pages[leaf * 2] ?? inside;
}

export function leafVerso(pages: THREE.CanvasTexture[], inside: THREE.CanvasTexture, leaf: number) {
  return pages[leaf * 2 + 1] ?? inside;
}
