import { clamp } from "../lib/clamp";
import type { Settings } from "../settings";

/**
 * Trạng thái chạy chữ. `pos` là quãng đã cuộn, tính theo điểm ảnh màn chiếu.
 * Các hàm bên dưới sửa trực tiếp đối tượng này vì chúng chạy mỗi khung hình.
 */
export interface EngineState {
  pos: number;
  playing: boolean;
  /** Số giây đếm ngược còn lại; 0 là không đếm. */
  counting: number;
}

export type Command =
  | { action: "toggle" }
  | { action: "pause" }
  | { action: "reset" }
  | { action: "seek"; value: number }
  | { action: "lines"; value: number }
  | { action: "px"; value: number };

type SpeedSettings = Pick<Settings, "speed" | "fontSize">;
type RunSettings = Pick<Settings, "speed" | "fontSize" | "lineHeight" | "countdown">;

export function createEngine(): EngineState {
  return { pos: 0, playing: false, counting: 0 };
}

/** Tốc độ cuộn (px/giây). Tỉ lệ với cỡ chữ để nhịp đọc không đổi khi đổi cỡ chữ. */
export function speedPx(s: SpeedSettings): number {
  return s.speed * s.fontSize * 0.04;
}

/** Chiều cao một dòng (px màn chiếu). */
export function lineHeightPx(s: Pick<Settings, "fontSize" | "lineHeight">): number {
  return s.fontSize * s.lineHeight;
}

/** Số giây còn lại tới cuối kịch bản; `null` khi tốc độ bằng 0. */
export function secondsLeft(e: EngineState, max: number, s: SpeedSettings): number | null {
  const v = speedPx(s);
  return v > 0 ? Math.max(0, max - e.pos) / v : null;
}

/** Tiến một bước thời gian `dt` (giây). `max` là vị trí cuộn lớn nhất. */
export function step(e: EngineState, dt: number, max: number, s: SpeedSettings): void {
  if (e.counting > 0) {
    e.counting -= dt;
    if (e.counting <= 0) {
      e.counting = 0;
      e.playing = true;
    }
  }
  if (e.playing) {
    e.pos += speedPx(s) * dt;
    if (e.pos >= max) {
      e.pos = max;
      e.playing = false;
    }
  }
}

function start(e: EngineState, max: number, s: RunSettings): void {
  if (e.pos >= max - 1) e.pos = 0; // đang ở cuối → chạy lại từ đầu
  if (e.pos < 1 && s.countdown > 0) e.counting = s.countdown;
  else e.playing = true;
}

export function runCmd(e: EngineState, cmd: Command, max: number, s: RunSettings): void {
  switch (cmd.action) {
    case "toggle":
      if (e.playing || e.counting > 0) {
        e.playing = false;
        e.counting = 0;
      } else start(e, max, s);
      break;
    case "pause":
      e.playing = false;
      e.counting = 0;
      break;
    case "reset":
      e.pos = 0;
      e.playing = false;
      e.counting = 0;
      break;
    case "seek":
      e.pos = cmd.value;
      break;
    case "lines":
      e.pos += cmd.value * lineHeightPx(s);
      break;
    case "px":
      e.pos += cmd.value;
      break;
  }
  e.pos = clamp(e.pos, 0, max);
}
