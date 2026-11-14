export type Align = "left" | "center";
export type Countdown = 0 | 3 | 5;

/** Cài đặt hiển thị và chạy chữ. Kích thước tính theo điểm ảnh của màn chiếu. */
export interface Settings {
  fontSize: number;
  lineHeight: number;
  /** Lề mỗi bên, tính theo % bề rộng. */
  margin: number;
  align: Align;
  font: string;
  mirrorH: boolean;
  mirrorV: boolean;
  fg: string;
  bg: string;
  cue: string;
  head: string;
  marker: boolean;
  /** Vị trí vạch đọc, tính theo % chiều cao. */
  markerPos: number;
  upper: boolean;
  countdown: Countdown;
  speed: number;
}

export const DEFAULT_SETTINGS: Settings = {
  fontSize: 80,
  lineHeight: 1.35,
  margin: 8,
  align: "left",
  font: "Arial",
  mirrorH: false,
  mirrorV: false,
  fg: "#ffffff",
  bg: "#000000",
  cue: "#ffd400",
  head: "#4fc3ff",
  marker: true,
  markerPos: 30,
  upper: false,
  countdown: 3,
  speed: 10,
};

export interface Range {
  min: number;
  max: number;
  step: number;
}

export const RANGES = {
  speed: { min: 0, max: 60, step: 0.5 },
  fontSize: { min: 24, max: 260, step: 2 },
  lineHeight: { min: 1, max: 2.2, step: 0.05 },
  margin: { min: 0, max: 35, step: 1 },
  markerPos: { min: 10, max: 70, step: 1 },
} satisfies Record<string, Range>;

export const FONTS = ["Arial", "Segoe UI", "Roboto", "Tahoma", "Verdana", "Times New Roman"];

const ALIGNS: Align[] = ["left", "center"];
const COUNTDOWNS: Countdown[] = [0, 3, 5];
const COLOR = /^#[0-9a-f]{6}$/i;

/**
 * Dựng cài đặt hợp lệ từ dữ liệu đã lưu: trường thiếu, sai kiểu hoặc ngoài khoảng
 * nhận giá trị mặc định (số ngoài khoảng được kẹp về biên).
 */
export function sanitizeSettings(raw: unknown): Settings {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_SETTINGS;
  const num = (key: keyof typeof RANGES): number => {
    const v = r[key];
    const { min, max } = RANGES[key];
    return typeof v === "number" && Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : d[key];
  };
  const bool = (key: "mirrorH" | "mirrorV" | "marker" | "upper"): boolean =>
    typeof r[key] === "boolean" ? r[key] : d[key];
  const color = (key: "fg" | "bg" | "cue" | "head"): string => {
    const v = r[key];
    return typeof v === "string" && COLOR.test(v) ? v : d[key];
  };
  return {
    fontSize: num("fontSize"),
    lineHeight: num("lineHeight"),
    margin: num("margin"),
    markerPos: num("markerPos"),
    speed: num("speed"),
    align: ALIGNS.includes(r.align as Align) ? (r.align as Align) : d.align,
    font: typeof r.font === "string" && FONTS.includes(r.font) ? r.font : d.font,
    countdown: COUNTDOWNS.includes(r.countdown as Countdown)
      ? (r.countdown as Countdown)
      : d.countdown,
    mirrorH: bool("mirrorH"),
    mirrorV: bool("mirrorV"),
    marker: bool("marker"),
    upper: bool("upper"),
    fg: color("fg"),
    bg: color("bg"),
    cue: color("cue"),
    head: color("head"),
  };
}
