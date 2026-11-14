import type { Command } from "./engine/engine";

export type KeyAction =
  | { type: "cmd"; cmd: Command }
  | { type: "speed"; delta: number }
  | { type: "font"; delta: number };

/** Đổi một phím bấm thành thao tác điều khiển; `null` nếu phím không được gán. */
export function resolveKey(key: string, shift: boolean): KeyAction | null {
  switch (key) {
    case " ":
      return { type: "cmd", cmd: { action: "toggle" } };
    case "ArrowUp":
      return { type: "speed", delta: shift ? 5 : 1 };
    case "ArrowDown":
      return { type: "speed", delta: shift ? -5 : -1 };
    case "ArrowLeft":
      return { type: "cmd", cmd: { action: "lines", value: -1 } };
    case "ArrowRight":
      return { type: "cmd", cmd: { action: "lines", value: 1 } };
    case "PageUp":
      return { type: "cmd", cmd: { action: "lines", value: -3 } };
    case "PageDown":
      return { type: "cmd", cmd: { action: "lines", value: 3 } };
    case "Home":
      return { type: "cmd", cmd: { action: "reset" } };
    case "+":
    case "=":
      return { type: "font", delta: 4 };
    case "-":
    case "_":
      return { type: "font", delta: -4 };
    default:
      return null;
  }
}
