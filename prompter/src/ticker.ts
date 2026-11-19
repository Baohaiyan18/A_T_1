import type { Range } from "./settings";

/** Hướng chạy: ngang (phải → trái) hoặc dọc (dưới → lên). */
export type TickerDir = "h" | "v";

/** Một lớp chữ chạy đè lên màn chiếu. Vị trí, độ dài tính theo % màn chiếu; cỡ chữ, tốc độ theo px màn chiếu. */
export interface Ticker {
  id: string;
  on: boolean;
  text: string;
  dir: TickerDir;
  /** Góc trên-trái của dải chữ. */
  x: number;
  y: number;
  /** Độ dài dải: bề rộng khi chạy ngang, chiều cao khi chạy dọc. */
  len: number;
  /** px/giây. */
  speed: number;
  /** Số lượt chạy rồi dừng; 0 = lặp vô hạn. */
  loops: number;
  fontSize: number;
  fg: string;
  bg: string;
  /** Có tô nền cho dải chữ hay không. */
  bgOn: boolean;
  /** Tăng lên để chạy lại từ đầu. */
  run: number;
}

export const TICKER_RANGES = {
  x: { min: 0, max: 100, step: 1 },
  y: { min: 0, max: 100, step: 1 },
  len: { min: 10, max: 100, step: 1 },
  speed: { min: 20, max: 600, step: 10 },
  loops: { min: 0, max: 50, step: 1 },
  fontSize: { min: 16, max: 200, step: 2 },
} satisfies Record<string, Range>;

export type TickerRangeKey = keyof typeof TICKER_RANGES;

export function newTicker(): Ticker {
  return {
    id: crypto.randomUUID(),
    on: true,
    text: "Nội dung chữ chạy",
    dir: "h",
    x: 0,
    y: 85,
    len: 100,
    speed: 150,
    loops: 0,
    fontSize: 56,
    fg: "#ffffff",
    bg: "#000000",
    bgOn: true,
    run: 0,
  };
}

const COLOR = /^#[0-9a-f]{6}$/i;

/** Lọc danh sách chữ chạy đã lưu: bỏ phần tử hỏng/trùng id, trường sai thì về mặc định. */
export function sanitizeTickers(raw: unknown): Ticker[] {
  if (!Array.isArray(raw)) return [];
  const out: Ticker[] = [];
  const seen = new Set<string>();
  for (const r of raw) {
    if (typeof r !== "object" || r === null) continue;
    const t = r as Record<string, unknown>;
    // id nằm trong tên class CSS nên chỉ nhận chữ, số, `-`, `_`.
    if (typeof t.id !== "string" || !/^[\w-]+$/.test(t.id) || seen.has(t.id)) continue;
    seen.add(t.id);
    const d = { ...newTicker(), id: t.id };
    const num = (key: TickerRangeKey) => {
      const v = t[key];
      const { min, max } = TICKER_RANGES[key];
      return typeof v === "number" && Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : d[key];
    };
    const color = (key: "fg" | "bg") => {
      const v = t[key];
      return typeof v === "string" && COLOR.test(v) ? v : d[key];
    };
    out.push({
      ...d,
      on: typeof t.on === "boolean" ? t.on : d.on,
      text: typeof t.text === "string" ? t.text : d.text,
      dir: t.dir === "v" ? "v" : "h",
      x: num("x"),
      y: num("y"),
      len: num("len"),
      speed: num("speed"),
      loops: Math.round(num("loops")),
      fontSize: num("fontSize"),
      fg: color("fg"),
      bg: color("bg"),
      bgOn: typeof t.bgOn === "boolean" ? t.bgOn : d.bgOn,
    });
  }
  return out;
}

/** Trạng thái chạy của một dải chữ (px khung đang vẽ). */
export interface TickerRun {
  /** Quãng đã chạy trong lượt hiện tại. */
  off: number;
  /** Số lượt đã chạy xong. */
  pass: number;
}

/**
 * Chạy thêm `dist` px. Một lượt dài bằng dải + chữ (chữ đi từ mép cuối dải tới khi ra hẳn mép đầu).
 * Trả về `true` khi đã chạy đủ số lượt (`loops > 0`).
 */
export function advanceTicker(run: TickerRun, dist: number, span: number, loops: number): boolean {
  if (loops > 0 && run.pass >= loops) return true;
  run.off += dist;
  if (span > 0 && run.off >= span) {
    run.pass += Math.floor(run.off / span);
    run.off %= span;
  }
  if (loops > 0 && run.pass >= loops) {
    run.off = 0;
    return true;
  }
  return false;
}
