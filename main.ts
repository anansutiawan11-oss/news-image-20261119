// Sum up 19 November 2026's world news in one image.
//
// Node 22, standard library only, no network at runtime. The program draws
// a newspaper-style front page in code (flat vector shapes + a bitmap font
// atlas baked into font.ts) and writes a deterministic 1024x1024 PNG to
// /output/entry.png (or $MAKEFUN_OUTPUT_DIR/entry.png outside the grader).
//
// Run:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

// Bitmap font atlas (DejaVu Sans, generated at build time by tools/gen_font.py).
// Read as data, not imported, so the program runs under any TS loader.
const FONT = JSON.parse(readFileSync(new URL('./font.json', import.meta.url), 'utf8')) as Record<
  string,
  {
    ascent: number;
    descent: number;
    size: number;
    glyphs: Record<string, { w: number; h: number; ax: number; ay: number; adv: number; data: string }>;
  }
>;
type FontKey = keyof typeof FONT;

type RGB = [number, number, number];

// ---------------------------------------------------------------- PNG out

const CRC_TABLE: Uint32Array = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}

function encodePng(w: number, h: number, rgba: Uint8Array): Buffer {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0; // filter: none
    raw.set(rgba.subarray(y * w * 4, (y + 1) * w * 4), y * (w * 4 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------- canvas

const W = 1024;
const H = 1024;

const PAPER: RGB = [246, 241, 231];
const INK: RGB = [26, 26, 26];
const NAVY: RGB = [18, 40, 75];
const GOLD: RGB = [201, 162, 39];
const RED: RGB = [179, 38, 30];
const WHITE: RGB = [255, 255, 255];

class Canvas {
  px = new Uint8Array(W * H * 4);

  constructor() {
    this.rect(0, 0, W, H, PAPER);
  }

  set(x: number, y: number, c: RGB, a = 255): void {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 4;
    this.px[i] = c[0];
    this.px[i + 1] = c[1];
    this.px[i + 2] = c[2];
    this.px[i + 3] = a;
  }

  rect(x: number, y: number, w: number, h: number, c: RGB): void {
    const x0 = Math.max(0, Math.round(x));
    const y0 = Math.max(0, Math.round(y));
    const x1 = Math.min(W, Math.round(x + w));
    const y1 = Math.min(H, Math.round(y + h));
    for (let yy = y0; yy < y1; yy++) {
      let i = (yy * W + x0) * 4;
      for (let xx = x0; xx < x1; xx++, i += 4) {
        this.px[i] = c[0];
        this.px[i + 1] = c[1];
        this.px[i + 2] = c[2];
        this.px[i + 3] = 255;
      }
    }
  }

  border(x: number, y: number, w: number, h: number, c: RGB, t = 2): void {
    this.rect(x, y, w, t, c);
    this.rect(x, y + h - t, w, t, c);
    this.rect(x, y, t, h, c);
    this.rect(x + w - t, y, t, h, c);
  }

  circle(cx: number, cy: number, r: number, c: RGB): void {
    const rr = Math.round(r);
    for (let dy = -rr; dy <= rr; dy++) {
      const dx = Math.floor(Math.sqrt(rr * rr - dy * dy));
      for (let xx = -dx; xx <= dx; xx++) this.set(Math.round(cx) + xx, Math.round(cy) + dy, c);
    }
  }

  // Thick line: stamp discs along the segment.
  line(x0: number, y0: number, x1: number, y1: number, w: number, c: RGB): void {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.max(1, Math.hypot(dx, dy));
    const steps = Math.ceil(len);
    const r = Math.max(0.5, w / 2);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      this.circle(x0 + dx * t, y0 + dy * t, r, c);
    }
  }

  polyline(pts: Array<[number, number]>, w: number, c: RGB): void {
    for (let i = 0; i + 1 < pts.length; i++) {
      this.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], w, c);
    }
  }

  triangle(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: RGB): void {
    const minX = Math.floor(Math.min(x0, x1, x2));
    const maxX = Math.ceil(Math.max(x0, x1, x2));
    const minY = Math.floor(Math.min(y0, y1, y2));
    const maxY = Math.ceil(Math.max(y0, y1, y2));
    const d = (x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0);
    if (d === 0) return;
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const a = ((x1 - x) * (y2 - y) - (y1 - y) * (x2 - x)) / d;
        const b = ((x2 - x) * (y0 - y) - (y2 - y) * (x0 - x)) / d;
        const g = 1 - a - b;
        if (a >= 0 && b >= 0 && g >= 0) this.set(x, y, c);
      }
    }
  }

  star(cx: number, cy: number, rOuter: number, rInner: number, c: RGB): void {
    const pts: Array<[number, number]> = [];
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? rOuter : rInner;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    // Fan-fill from the centre.
    for (let i = 0; i < 10; i++) {
      const p1 = pts[i];
      const p2 = pts[(i + 1) % 10];
      this.triangle(cx, cy, p1[0], p1[1], p2[0], p2[1], c);
    }
  }

  roundRect(x: number, y: number, w: number, h: number, r: number, c: RGB): void {
    this.rect(x + r, y, w - 2 * r, h, c);
    this.rect(x, y + r, w, h - 2 * r, c);
    this.circle(x + r, y + r, r, c);
    this.circle(x + w - r, y + r, r, c);
    this.circle(x + r, y + h - r, r, c);
    this.circle(x + w - r, y + h - r, r, c);
  }

  // ------------------------------------------------------------ text
  private glyphCache = new Map<string, { w: number; h: number; ax: number; ay: number; adv: number; bits: Buffer }>();

  private glyph(key: FontKey, ch: string) {
    const ck = key + ch;
    let g = this.glyphCache.get(ck);
    if (g) return g;
    const f = FONT[key];
    const raw = (f.glyphs as Record<string, { w: number; h: number; ax: number; ay: number; adv: number; data: string }>)[ch]
      ?? (f.glyphs as Record<string, { w: number; h: number; ax: number; ay: number; adv: number; data: string }>)['?'];
    g = { w: raw.w, h: raw.h, ax: raw.ax, ay: raw.ay, adv: raw.adv, bits: Buffer.from(raw.data, 'base64') };
    this.glyphCache.set(ck, g);
    return g;
  }

  textWidth(key: FontKey, s: string): number {
    let w = 0;
    for (const ch of s) w += this.glyph(key, ch).adv;
    return w;
  }

  // Draws text with its baseline at y. Returns the x after the last glyph.
  drawText(key: FontKey, x: number, y: number, s: string, c: RGB, align: 'left' | 'center' = 'left'): number {
    const f = FONT[key];
    let pen = align === 'center' ? Math.round(x - this.textWidth(key, s) / 2) : Math.round(x);
    for (const ch of s) {
      const g = this.glyph(key, ch);
      if (g.w > 0 && g.h > 0) {
        const gx = pen + g.ax;
        const gy = y - f.ascent + g.ay;
        for (let yy = 0; yy < g.h; yy++) {
          for (let xx = 0; xx < g.w; xx++) {
            const bit = (yy * g.w + xx);
            if ((g.bits[bit >> 3] >> (7 - (bit & 7))) & 1) this.set(gx + xx, gy + yy, c);
          }
        }
      }
      pen += g.adv;
    }
    return pen;
  }

  wrap(key: FontKey, s: string, maxW: number): string[] {
    const words = s.split(' ');
    const lines: string[] = [];
    let cur = '';
    for (const word of words) {
      const test = cur ? cur + ' ' + word : word;
      if (this.textWidth(key, test) <= maxW || !cur) {
        cur = test;
      } else {
        lines.push(cur);
        cur = word;
      }
    }
    if (cur) lines.push(cur);
    return lines;
  }
}

// ---------------------------------------------------------------- icons
// All icons are flat vector shapes drawn in code, centred on (cx, cy).

function iconScales(cv: Canvas, cx: number, cy: number, c: RGB): void {
  cv.line(cx, cy - 20, cx, cy + 18, 4, c);
  cv.line(cx - 26, cy - 20, cx + 26, cy - 20, 4, c);
  cv.line(cx - 10, cy + 18, cx + 10, cy + 18, 4, c);
  for (const s of [-1, 1]) {
    const bx = cx + s * 26;
    cv.line(bx, cy - 20, bx - s * 8, cy + 2, 2, c);
    cv.line(bx, cy - 20, bx + s * 8, cy + 2, 2, c);
    cv.triangle(bx - s * 10, cy + 2, bx + s * 10, cy + 2, bx, cy + 16, c);
  }
}

function iconChart(cv: Canvas, cx: number, cy: number, c: RGB, up: RGB): void {
  cv.line(cx - 30, cy + 20, cx - 30, cy - 20, 3, c);
  cv.line(cx - 30, cy + 20, cx + 32, cy + 20, 3, c);
  cv.polyline(
    [[cx - 26, cy + 14], [cx - 10, cy + 6], [cx + 4, cy - 2], [cx + 18, cy - 14]],
    5, up,
  );
  cv.triangle(cx + 18, cy - 14, cx + 8, cy - 14, cx + 18, cy - 4, up);
}

function iconBridge(cv: Canvas, cx: number, cy: number, c: RGB): void {
  cv.line(cx - 34, cy + 12, cx + 34, cy + 12, 4, c);
  cv.line(cx - 20, cy + 12, cx - 20, cy - 16, 4, c);
  cv.line(cx + 20, cy + 12, cx + 20, cy - 16, 4, c);
  cv.line(cx - 20, cy - 16, cx, cy + 12, 2, c);
  cv.line(cx + 20, cy - 16, cx, cy + 12, 2, c);
  cv.star(cx, cy - 8, 13, 5, [249, 115, 22]);
  cv.star(cx, cy - 8, 6, 2.5, [253, 224, 71]);
}

function iconTank(cv: Canvas, cx: number, cy: number, c: RGB): void {
  cv.roundRect(cx - 30, cy - 2, 60, 16, 4, c);
  cv.rect(cx - 10, cy - 14, 26, 12, c);
  cv.line(cx + 16, cy - 8, cx + 34, cy - 8, 4, c);
  for (const wx of [-22, -8, 6, 20]) cv.circle(cx + wx, cy + 14, 4, [30, 30, 30]);
}

function iconController(cv: Canvas, cx: number, cy: number, c: RGB, accent: RGB): void {
  cv.roundRect(cx - 32, cy - 14, 64, 28, 10, c);
  cv.line(cx - 20, cy - 5, cx - 20, cy + 5, 4, accent);
  cv.line(cx - 25, cy, cx - 15, cy, 4, accent);
  for (const [dx, dy] of [[16, -5], [22, 0], [16, 5], [10, 0]] as Array<[number, number]>) {
    cv.circle(cx + dx, cy + dy, 3, accent);
  }
  cv.circle(cx - 6, cy + 6, 3, accent);
  cv.circle(cx + 4, cy + 6, 3, accent);
}

function iconPainting(cv: Canvas, cx: number, cy: number): void {
  cv.rect(cx - 30, cy - 18, 60, 36, GOLD);
  cv.rect(cx - 26, cy - 14, 52, 28, [96, 165, 250]);
  cv.rect(cx - 26, cy + 2, 52, 12, [77, 124, 15]);
  cv.line(cx - 2, cy + 14, cx - 2, cy - 4, 4, [120, 53, 15]);
  cv.circle(cx - 10, cy - 6, 8, [34, 197, 94]);
  cv.circle(cx + 6, cy - 8, 9, [22, 163, 74]);
  cv.circle(cx + 2, cy - 2, 7, [74, 222, 128]);
}

// Hero illustration: US, China and Russia flags on poles over a skyline.
function drawHeroArt(cv: Canvas, x: number, y: number, w: number, h: number): void {
  const SKY: RGB = [191, 217, 234];
  cv.rect(x, y, w, h, SKY);
  // Shenzhen skyline silhouette along the bottom.
  const base = y + h;
  const towers: Array<[number, number]> = [[0, 34], [44, 52], [88, 40], [132, 60], [178, 44], [224, 56], [270, 38], [316, 48]];
  for (const [tx, th] of towers) {
    cv.rect(x + tx, base - th, 40, th, NAVY);
  }
  for (const [tx, th] of towers) {
    for (let wy = base - th + 8; wy < base - 8; wy += 12) {
      for (let wx = tx + 8; wx < tx + 34; wx += 12) {
        cv.rect(x + wx, wy, 4, 5, [253, 224, 71]);
      }
    }
  }
  const flagX = [28, 144, 260];
  const flagY = y + 34;
  const fw = 92;
  const fh = 56;
  for (let i = 0; i < 3; i++) {
    const fx = x + flagX[i];
    cv.line(fx + 2, flagY + fh, fx + 2, base - 4, 4, [68, 68, 68]);
    cv.circle(fx + 2, flagY - 4, 4, GOLD);
    if (i === 0) {
      // United States: stripes + blue canton with stars.
      for (let s = 0; s < 13; s++) {
        cv.rect(fx + 4, flagY + s * 4 + (s === 12 ? 0 : 0), fw - 4, 4, s % 2 === 0 ? [179, 38, 30] : WHITE);
      }
      cv.rect(fx + 4, flagY, 38, 28, [18, 40, 75]);
      for (let r = 0; r < 3; r++) {
        for (let cc = 0; cc < 4; cc++) {
          cv.circle(fx + 10 + cc * 9, flagY + 7 + r * 9, 1, WHITE);
        }
      }
    } else if (i === 1) {
      // China: red field, one large star + four small stars.
      cv.rect(fx + 4, flagY, fw - 4, fh, [222, 0, 0]);
      cv.star(fx + 20, flagY + 16, 10, 4, [255, 222, 0]);
      for (const [sx, sy] of [[40, 8], [48, 16], [42, 26], [32, 28]] as Array<[number, number]>) {
        cv.star(fx + sx, flagY + sy, 4, 1.6, [255, 222, 0]);
      }
    } else {
      // Russia: white / blue / red horizontal bands.
      cv.rect(fx + 4, flagY, fw - 4, 19, WHITE);
      cv.rect(fx + 4, flagY + 19, fw - 4, 18, [0, 57, 166]);
      cv.rect(fx + 4, flagY + 37, fw - 4, 19, [213, 0, 50]);
    }
    cv.border(fx + 4, flagY, fw - 4, fh, [0, 0, 0], 1);
  }
}

// ---------------------------------------------------------------- layout

interface Panel {
  band: RGB;
  kicker: string;
  kickerColor: RGB;
  headline: string[];
  body: string;
  icon: (cv: Canvas, cx: number, cy: number) => void;
}

const PANELS: Panel[] = [
  {
    band: [27, 58, 92], kicker: 'THE HAGUE', kickerColor: [138, 109, 27],
    headline: ['MYANMAR GUILTY', 'OF GENOCIDE'],
    body: 'ICJ finds Myanmar guilty over the Rohingya, 9–6.',
    icon: (cv, cx, cy) => iconScales(cv, cx, cy, [232, 193, 90]),
  },
  {
    band: [20, 83, 45], kicker: 'WALL STREET', kickerColor: [21, 128, 61],
    headline: ['RECORD $81.3BN', 'AI IPO'],
    body: 'Anthropic prices at $83; shares jump ~18% on debut.',
    icon: (cv, cx, cy) => iconChart(cv, cx, cy, WHITE, [74, 222, 128]),
  },
  {
    band: [51, 65, 85], kicker: 'CRIMEA', kickerColor: [194, 65, 12],
    headline: ['UKRAINE HITS', 'CRIMEA BRIDGE'],
    body: 'Third strike on the crossing; rail traffic halted.',
    icon: (cv, cx, cy) => iconBridge(cv, cx, cy, WHITE),
  },
  {
    band: [87, 83, 78], kicker: 'GAZA', kickerColor: [185, 28, 28],
    headline: ['TANKS PUSH INTO', 'CENTRAL GAZA'],
    body: 'Past the ceasefire line at Nuseirat; plan scores 4 of 26.',
    icon: (cv, cx, cy) => iconTank(cv, cx, cy, [41, 65, 20]),
  },
  {
    band: [76, 29, 149], kicker: 'GAMING', kickerColor: [109, 40, 217],
    headline: ['GTA VI IS OUT'],
    body: 'Biggest entertainment launch ever — 99 on Metacritic.',
    icon: (cv, cx, cy) => iconController(cv, cx, cy, [30, 27, 75], [196, 141, 255]),
  },
  {
    band: [15, 118, 110], kicker: 'ART', kickerColor: [146, 64, 14],
    headline: ['VAN GOGH SELLS', 'FOR $190.4M'],
    body: 'Blossoming Chestnut Trees sets an artist record in New York.',
    icon: (cv, cx, cy) => iconPainting(cv, cx, cy),
  },
];

function drawPanel(cv: Canvas, p: Panel, x: number, y: number, w: number, h: number): void {
  cv.rect(x, y, w, h, WHITE);
  cv.border(x, y, w, h, INK, 2);
  cv.rect(x + 2, y + 2, w - 4, 56, p.band);
  p.icon(cv, x + w / 2, y + 30);
  const tx = x + 16;
  cv.drawText('bold26', tx, y + 82, p.kicker, p.kickerColor);
  // Headlines are wrapped to the panel width; copy is written to fit 2 lines.
  const headLines = cv.wrap('bold26', p.headline.join(' '), w - 32);
  if (headLines.length > 2) console.error(`TRUNCATED headline: ${p.headline.join(' ')}`);
  let by = y + 110;
  for (const line of headLines.slice(0, 2)) {
    cv.drawText('bold26', tx, by, line, INK);
    by += 28;
  }
  const bodyLines = cv.wrap('reg24', p.body, w - 32);
  if (bodyLines.length > 3) console.error(`TRUNCATED body: ${p.body}`);
  by = y + 164;
  for (const line of bodyLines.slice(0, 3)) {
    cv.drawText('reg24', tx, by, line, [64, 64, 64]);
    by += 26;
  }
}

function build(): Buffer {
  const cv = new Canvas();

  // Masthead.
  cv.rect(0, 0, W, 136, NAVY);
  cv.rect(0, 136, W, 4, GOLD);
  cv.drawText('bold56', W / 2, 62, 'THE WORLD IN ONE DAY', WHITE, 'center');
  cv.drawText('bold38', W / 2, 116, 'THURSDAY · 19 NOVEMBER 2026', GOLD, 'center');

  // Hero: the Shenzhen summit.
  const hx = 24;
  const hy = 156;
  const hw = 976;
  const hh = 296;
  cv.rect(hx, hy, hw, hh, WHITE);
  cv.border(hx, hy, hw, hh, INK, 2);
  drawHeroArt(cv, hx + 2, hy + 2, 380, hh - 4);
  const tx = hx + 404;
  cv.drawText('bold26', tx, hy + 52, 'SHENZHEN · THREE-WAY SUMMIT', RED);
  cv.drawText('bold56', tx, hy + 118, 'TRUMP, XI &', INK);
  cv.drawText('bold56', tx, hy + 178, 'PUTIN MEET', INK);
  const sub = cv.wrap('reg30', 'A four-point ‘peace declaration’ — with no mention of Ukraine or Iran.', 548);
  let sy = hy + 224;
  for (const line of sub) {
    cv.drawText('reg30', tx, sy, line, [64, 64, 64]);
    sy += 34;
  }

  // Six stories, two rows of three.
  const cols = [24, 360, 696];
  const rows = [468, 704];
  let i = 0;
  for (const ry of rows) {
    for (const cx of cols) {
      drawPanel(cv, PANELS[i], cx, ry, 304, 224);
      i++;
    }
  }

  // Footer: three more stories in one strip.
  cv.rect(0, 940, W, 84, NAVY);
  cv.rect(0, 940, W, 4, GOLD);
  cv.drawText('reg24', W / 2, 972, 'ALSO: Denmark backs Greenland deal 109–0 · EU proposes €45bn Ukraine loan', WHITE, 'center');
  cv.drawText('reg24', W / 2, 1000, 'US Senate rejects Iran war-powers vote 51–48 · COP31 talks push on in Antalya', WHITE, 'center');

  return encodePng(W, H, cv.px);
}

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(outDir, { recursive: true });
const png = build();
writeFileSync(join(outDir, 'entry.png'), png);
console.log(`wrote ${join(outDir, 'entry.png')} (${png.length} bytes, 1024x1024)`);
