export type TimerState = "idle" | "ok" | "over";

/** Nội dung đồng hồ ở góc trên-phải. */
export interface TimerView {
  text: string;
  state: TimerState;
  /** Thời gian đã đọc, dạng `mm:ss`. */
  elapsed: string;
}

/** Đổi số giây (đã làm tròn xuống) thành `mm:ss`, từ 1 giờ trở lên thành `h:mm:ss`. */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const pad = (n: number) => String(n).padStart(2, "0");
  const h = Math.floor(s / 3600);
  const mmss = `${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
  return h > 0 ? `${h}:${mmss}` : mmss;
}

/**
 * Đồng hồ của một tab. `startedAt` là `Date.now()` lúc chữ bắt đầu chạy (`null` = chưa chạy),
 * `targetSec` là mốc giờ (0 = tắt đếm ngược, chỉ hiện thời gian đã đọc).
 */
export function timerView(startedAt: number | null, targetSec: number, now: number): TimerView {
  const read = startedAt === null ? 0 : Math.floor(Math.max(0, now - startedAt) / 1000);
  const elapsed = clock(read);
  if (startedAt === null) return { text: clock(targetSec), state: "idle", elapsed };
  if (targetSec <= 0) return { text: elapsed, state: "ok", elapsed };
  const left = targetSec - read;
  return left >= 0
    ? { text: clock(left), state: "ok", elapsed }
    : { text: `+${clock(-left)}`, state: "over", elapsed };
}

/** Đọc mốc giờ người dùng gõ: `m`, `m:ss` hoặc `h:mm:ss`. Sai định dạng thì trả `null`. */
export function parseClock(input: string): number | null {
  const parts = input.trim().split(":");
  if (parts.length > 3 || parts.some((p) => !/^\d{1,4}$/.test(p))) return null;
  const nums = parts.map(Number);
  if (nums.length === 1) return nums[0] * 60;
  if (nums.slice(1).some((n) => n >= 60)) return null;
  return nums.reduce((total, n) => total * 60 + n, 0);
}
