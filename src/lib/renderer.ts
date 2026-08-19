import { FONT_STACKS, TEXT_COLORS, getTheme, type StyleSettings } from "./themes";

export interface RenderLine {
  text: string;
  startMs: number | null;
  kind: string;
}

export interface FrameInput {
  timeMs: number;
  durationMs: number;
  lines: RenderLine[];
  style: StyleSettings;
  themeId: string;
  title: string;
  artist: string;
  logo?: CanvasImageSource | null;
}

const INTRO_MS = 3000;
const OUTRO_MS = 3500;

function easeOut(t: number) {
  return 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
}

function timedLines(lines: RenderLine[]) {
  return lines
    .map((l, i) => ({ ...l, index: i }))
    .filter((l) => l.startMs !== null && l.kind !== "gap")
    .sort((a, b) => (a.startMs ?? 0) - (b.startMs ?? 0));
}

export function activeLineAt(lines: RenderLine[], timeMs: number) {
  const timed = timedLines(lines);
  let current: (typeof timed)[number] | null = null;
  let next: (typeof timed)[number] | null = null;
  for (let i = 0; i < timed.length; i++) {
    const item = timed[i]!;
    if ((item.startMs ?? 0) <= timeMs) {
      current = item;
      next = timed[i + 1] ?? null;
    } else {
      if (!current) next = item;
      break;
    }
  }
  return { current, next };
}

function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, themeId: string) {
  const theme = getTheme(themeId);
  const grad = ctx.createRadialGradient(w * 0.5, h * 0.42, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.8);
  grad.addColorStop(0, theme.bg[0]);
  grad.addColorStop(1, theme.bg[1]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Rotating light sweep.
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate((t * 0.06) % (Math.PI * 2));
  const sweep = ctx.createLinearGradient(-w, 0, w, 0);
  sweep.addColorStop(0, "rgba(0,0,0,0)");
  sweep.addColorStop(0.5, theme.sweep);
  sweep.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = sweep;
  ctx.fillRect(-w, -h * 0.35, w * 2, h * 0.7);
  ctx.restore();

  // Drifting particles.
  const count = 70;
  for (let i = 0; i < count; i++) {
    const seed = i * 12.9898;
    const rx = Math.abs(Math.sin(seed) * 43758.5453) % 1;
    const ry = Math.abs(Math.sin(seed * 1.7) * 12345.678) % 1;
    const speed = 0.02 + (Math.abs(Math.sin(seed * 3.3)) % 1) * 0.06;
    const y = (ry - t * speed * 0.08) % 1;
    const py = (y < 0 ? y + 1 : y) * h;
    const px = (rx * w + Math.sin(t * 0.3 + i) * w * 0.01) % w;
    const size = 1 + (Math.abs(Math.sin(seed * 5.1)) % 1) * 2.6;
    const alpha = 0.15 + (Math.abs(Math.sin(seed * 7.7 + t * 0.5)) % 1) * 0.5;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = theme.particle;
    ctx.beginPath();
    ctx.arc(px, py, size * (w / 1280), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Waves at the bottom, echoing the logo.
  theme.waves.forEach((color, wi) => {
    ctx.beginPath();
    const base = h * (0.86 + wi * 0.05);
    const amp = h * (0.03 - wi * 0.008);
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 8) {
      const y = base + Math.sin(x / (w / 3) + t * (0.6 + wi * 0.25)) * amp;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  });

  // Vignette.
  const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(" ");
  const rows: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      rows.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) rows.push(line);
  return rows;
}

function fillGradientText(
  ctx: CanvasRenderingContext2D,
  rows: string[],
  cx: number,
  cy: number,
  lineHeight: number,
  colors: [string, string],
) {
  const total = rows.length * lineHeight;
  const top = cy - total / 2 + lineHeight / 2;
  const grad = ctx.createLinearGradient(0, top - lineHeight / 2, 0, top + total);
  grad.addColorStop(0, colors[0]);
  grad.addColorStop(1, colors[1]);
  ctx.fillStyle = grad;
  rows.forEach((row, i) => ctx.fillText(row, cx, top + i * lineHeight));
}

function drawLogo(
  ctx: CanvasRenderingContext2D,
  logo: CanvasImageSource,
  w: number,
  h: number,
  position: StyleSettings["watermark"],
) {
  if (position === "none") return;
  const size = w * 0.09;
  const pad = w * 0.03;
  const x = position.includes("right") ? w - size - pad : pad;
  const y = position.includes("bottom") ? h - size - pad : pad;
  ctx.save();
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(logo, x, y, size, size);
  ctx.restore();
}

export function drawFrame(ctx: CanvasRenderingContext2D, w: number, h: number, input: FrameInput) {
  const { timeMs, durationMs, lines, style, themeId, title, artist, logo } = input;
  const t = timeMs / 1000;
  ctx.clearRect(0, 0, w, h);
  drawBackground(ctx, w, h, t, themeId);

  const colors = TEXT_COLORS[style.textPalette];
  const font = FONT_STACKS[style.font];
  const baseSize = h * 0.085 * style.fontScale;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Intro card.
  if (style.intro && timeMs < INTRO_MS) {
    const p = easeOut(timeMs / 900);
    const out = timeMs > INTRO_MS - 500 ? 1 - (timeMs - (INTRO_MS - 500)) / 500 : 1;
    ctx.globalAlpha = p * out;
    if (logo) {
      const size = w * 0.2;
      ctx.save();
      ctx.beginPath();
      ctx.arc(w / 2, h * 0.34, size / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(logo, w / 2 - size / 2, h * 0.34 - size / 2, size, size);
      ctx.restore();
    }
    ctx.font = `700 ${baseSize}px ${font}`;
    fillGradientText(ctx, wrapText(ctx, title || "Untitled", w * 0.8), w / 2, h * 0.62, baseSize * 1.2, colors);
    ctx.font = `400 ${baseSize * 0.45}px ${font}`;
    ctx.fillStyle = "rgba(255,255,255,0.72)";
    if (artist) ctx.fillText(artist, w / 2, h * 0.75);
    ctx.globalAlpha = 1;
    if (logo) drawLogo(ctx, logo, w, h, style.watermark);
    return;
  }

  // Outro card.
  if (style.outro && durationMs > 0 && timeMs > durationMs - OUTRO_MS) {
    const p = easeOut((timeMs - (durationMs - OUTRO_MS)) / 800);
    ctx.globalAlpha = p;
    if (logo) {
      const size = w * 0.22;
      ctx.save();
      ctx.beginPath();
      ctx.arc(w / 2, h * 0.42, size / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(logo, w / 2 - size / 2, h * 0.42 - size / 2, size, size);
      ctx.restore();
    }
    ctx.font = `700 ${baseSize * 0.6}px ${font}`;
    fillGradientText(ctx, ["KINGSLEY HUB LYRICS"], w / 2, h * 0.68, baseSize, colors);
    ctx.globalAlpha = 1;
    return;
  }

  const { current, next } = activeLineAt(lines, timeMs);

  if (current) {
    const since = timeMs - (current.startMs ?? 0);
    const enter = Math.min(1, since / 420);
    const eased = easeOut(enter);
    const text = style.uppercase ? current.text.toUpperCase() : current.text;
    const isSection = current.kind === "section";
    const size = isSection ? baseSize * 0.55 : baseSize;

    ctx.save();
    ctx.font = `${isSection ? 500 : 700} ${size}px ${font}`;
    const rows = wrapText(ctx, text, w * 0.82);
    const lineHeight = size * 1.22;
    const cy = h * 0.5;

    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = size * 0.25;

    if (style.animation === "fade") {
      ctx.globalAlpha = eased;
    } else if (style.animation === "slide") {
      ctx.globalAlpha = eased;
      ctx.translate(0, (1 - eased) * size * 0.7);
    } else if (style.animation === "pop") {
      ctx.globalAlpha = eased;
      const s = 0.86 + eased * 0.14;
      ctx.translate(w / 2, cy);
      ctx.scale(s, s);
      ctx.translate(-w / 2, -cy);
    } else if (style.animation === "wipe") {
      ctx.globalAlpha = 1;
      const reveal = Math.min(1, since / 700);
      ctx.beginPath();
      ctx.rect(w * 0.09, 0, w * 0.82 * reveal, h);
      ctx.clip();
    }

    if (isSection) {
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      rows.forEach((row, i) => ctx.fillText(row, w / 2, cy - ((rows.length - 1) * lineHeight) / 2 + i * lineHeight));
    } else {
      fillGradientText(ctx, rows, w / 2, cy, lineHeight, colors);
    }
    ctx.restore();
  }

  if (style.showNext && next) {
    ctx.save();
    ctx.font = `400 ${baseSize * 0.42}px ${font}`;
    ctx.globalAlpha = 0.42;
    ctx.fillStyle = "#FFFFFF";
    const rows = wrapText(ctx, style.uppercase ? next.text.toUpperCase() : next.text, w * 0.7);
    rows.slice(0, 2).forEach((row, i) => ctx.fillText(row, w / 2, h * 0.73 + i * baseSize * 0.5));
    ctx.restore();
  }

  if (logo) drawLogo(ctx, logo, w, h, style.watermark);
}

export function resolutionFor(aspect: string, quality: "720p" | "1080p") {
  const long = quality === "1080p" ? 1920 : 1280;
  const short = quality === "1080p" ? 1080 : 720;
  return aspect === "9:16" ? { width: short, height: long } : { width: long, height: short };
}
