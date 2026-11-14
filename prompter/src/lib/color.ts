import { clamp } from "./clamp";

export interface Hsv {
  /** Hue 0..360 */
  h: number;
  /** Saturation 0..1 */
  s: number;
  /** Value 0..1 */
  v: number;
}

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface HexCell {
  q: number;
  r: number;
  x: number;
  y: number;
  color: string;
}

/** 14 màu mẫu mặc định giống bảng tham chiếu. */
export const DEFAULT_SAVED_COLORS: readonly string[] = [
  "#ef4444",
  "#f97316",
  "#facc15",
  "#4ade80",
  "#2dd4bf",
  "#3b82f6",
  "#6366f1",
  "#ec4899",
  "#f43f5e",
  "#d946ef",
  "#8b5cf6",
  "#0ea5e9",
  "#10b981",
  "#84cc16",
];

/** Chuẩn hóa mã màu Hex 3 hoặc 6 ký tự về dạng `#rrggbb` chữ thường, hoặc `null` nếu sai. */
export function normalizeHex(input: string): string | null {
  const clean = input.trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(clean)) {
    const [r, g, b] = clean.toLowerCase();
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  if (/^[0-9a-f]{6}$/i.test(clean)) {
    return `#${clean.toLowerCase()}`;
  }
  return null;
}

const toHexByte = (n: number): string =>
  clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");

export function rgbToHex(r: number, g: number, b: number): string {
  return `#${toHexByte(r)}${toHexByte(g)}${toHexByte(b)}`;
}

export function hexToRgb(hex: string): Rgb {
  const norm = normalizeHex(hex) ?? "#000000";
  return {
    r: parseInt(norm.slice(1, 3), 16),
    g: parseInt(norm.slice(3, 5), 16),
    b: parseInt(norm.slice(5, 7), 16),
  };
}

export function formatRgb(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  return `${r}, ${g}, ${b}`;
}

export function parseRgbInput(input: string): string | null {
  const parts = input
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean);
  if (parts.length !== 3) return null;
  const nums = parts.map((p) => Number(p));
  if (nums.some((n) => !Number.isFinite(n))) return null;
  return rgbToHex(nums[0]!, nums[1]!, nums[2]!);
}

export function hexToHsv(hex: string): Hsv {
  const { r: r255, g: g255, b: b255 } = hexToRgb(hex);
  const r = r255 / 255;
  const g = g255 / 255;
  const b = b255 / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  let h = 0;
  if (d > 0) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
  }

  const s = max === 0 ? 0 : d / max;
  return { h, s, v: max };
}

export function hsvToHex(h: number, s: number, v: number): string {
  const hue = ((h % 360) + 360) % 360;
  const sat = clamp(s, 0, 1);
  const val = clamp(v, 0, 1);

  const c = val * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = val - c;

  const [r, g, b]: [number, number, number] =
    hue < 60
      ? [c, x, 0]
      : hue < 120
        ? [x, c, 0]
        : hue < 180
          ? [0, c, x]
          : hue < 240
            ? [0, x, c]
            : hue < 300
              ? [x, 0, c]
              : [c, 0, x];

  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

/** Bán kính đường tròn ngoại tiếp mỗi ô lục giác trong SVG (px). */
export const HEX_RADIUS = 10;
const SQRT3 = Math.sqrt(3);

/** Tọa độ đỉnh đa giác lục giác nhọn đầu (pointy-top) quanh tâm (cx, cy). */
export function hexPoints(cx: number, cy: number, radius = HEX_RADIUS): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = ((60 * i - 30) * Math.PI) / 180;
    const px = cx + radius * Math.cos(angle);
    const py = cy + radius * Math.sin(angle);
    pts.push(`${px.toFixed(2)},${py.toFixed(2)}`);
  }
  return pts.join(" ");
}

const RING_SV: readonly [number, number][] = [
  [0, 1],
  [0.28, 1],
  [0.54, 0.98],
  [0.78, 0.96],
  [0.95, 0.92],
  [1, 0.72],
  [1, 0.45],
];

/** Lưới tổ ong 127 ô lục giác (bán kính trục 6). */
export const HEXAGON_CELLS: readonly HexCell[] = (() => {
  const cells: HexCell[] = [];
  const R = 6;
  for (let r = -R; r <= R; r++) {
    const qMin = Math.max(-R, -r - R);
    const qMax = Math.min(R, -r + R);
    for (let q = qMin; q <= qMax; q++) {
      const x = SQRT3 * HEX_RADIUS * (q + r / 2);
      const y = 1.5 * HEX_RADIUS * r;
      const dist = Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r));
      if (dist === 0) {
        cells.push({ q, r, x, y, color: "#ffffff" });
      } else {
        const theta = (Math.atan2(y, x) * 180) / Math.PI;
        const hue = (theta + 300 + 360) % 360;
        const [s, v] = RING_SV[dist] ?? [1, 0.5];
        cells.push({ q, r, x, y, color: hsvToHex(hue, s, v) });
      }
    }
  }
  return cells;
})();

/** Dải 13 ô lục giác thang độ xám (7 ô hàng trên + 6 ô hàng dưới xen kẽ). */
export const GRAY_CELLS: readonly { x: number; y: number; color: string }[] = (() => {
  const total = 13;
  const list: { x: number; y: number; color: string }[] = [];
  for (let i = 0; i < total; i++) {
    const row = i % 2;
    const col = Math.floor(i / 2);
    const x = SQRT3 * HEX_RADIUS * (col + row * 0.5);
    const y = 1.5 * HEX_RADIUS * row;
    const level = Math.round(255 * (1 - i / (total - 1)));
    list.push({ x, y, color: rgbToHex(level, level, level) });
  }
  return list;
})();
