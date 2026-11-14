import { isTauri } from "@tauri-apps/api/core";
import { emitTo } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import type { Command } from "../engine/engine";
import type { Settings } from "../settings";

/** Tin từ màn điều khiển gửi sang màn chiếu. */
export type CtlMsg =
  | { type: "init"; settings: Settings; text: string; pos: number; playing: boolean }
  | { type: "settings"; settings: Settings }
  | { type: "script"; text: string }
  | { type: "cmd"; cmd: Command };

/** Tin từ màn chiếu gửi về màn điều khiển. */
export type OutMsg =
  | { type: "hello" }
  | { type: "pos"; pos: number; playing: boolean; counting: number; w: number; h: number }
  | { type: "speed"; value: number };

export interface Channel<Send, Receive> {
  send(msg: Send): void;
  /** Đăng ký nhận tin; trả về hàm hủy đăng ký. */
  listen(handler: (msg: Receive) => void): () => void;
}

type Side = "ctl" | "out";
const EVENT: Record<Side, string> = { ctl: "prompter:ctl", out: "prompter:out" };
const PEER_LABEL: Record<Side, string> = { ctl: "output", out: "main" };

/** Bản ứng dụng: sự kiện Tauri gửi đích danh tới cửa sổ bên kia. */
function tauriChannel<S, R>(side: Side): Channel<S, R> {
  const other: Side = side === "ctl" ? "out" : "ctl";
  return {
    send(msg) {
      // Cửa sổ bên kia chưa mở thì tin bị bỏ qua.
      emitTo(PEER_LABEL[side], EVENT[side], msg).catch(() => {});
    },
    listen(handler) {
      let unlisten: (() => void) | undefined;
      let cancelled = false;
      getCurrentWebviewWindow()
        .listen<R>(EVENT[other], (e) => handler(e.payload))
        .then((fn) => {
          if (cancelled) fn();
          else unlisten = fn;
        })
        .catch(() => {});
      return () => {
        cancelled = true;
        unlisten?.();
      };
    },
  };
}

/** Chạy trong trình duyệt: BroadcastChannel giữa các thẻ cùng nguồn. */
function browserChannel<S, R>(side: Side): Channel<S, R> {
  const bc = new BroadcastChannel("prompter");
  return {
    send(msg) {
      bc.postMessage({ side, msg });
    },
    listen(handler) {
      const onMessage = (e: MessageEvent<{ side: Side; msg: R }>) => {
        if (e.data?.side !== side) handler(e.data.msg);
      };
      bc.addEventListener("message", onMessage);
      return () => bc.removeEventListener("message", onMessage);
    },
  };
}

function channel<S, R>(side: Side): Channel<S, R> {
  return isTauri() ? tauriChannel(side) : browserChannel(side);
}

let control: Channel<CtlMsg, OutMsg> | undefined;
let output: Channel<OutMsg, CtlMsg> | undefined;

/** Kênh của màn điều khiển (dùng chung một kênh cho cả cửa sổ). */
export function controlChannel(): Channel<CtlMsg, OutMsg> {
  return (control ??= channel("ctl"));
}

/** Kênh của màn chiếu. */
export function outputChannel(): Channel<OutMsg, CtlMsg> {
  return (output ??= channel("out"));
}
