import { invoke, isTauri } from "@tauri-apps/api/core";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";

/** Thông tin một màn hình; kích thước và vị trí tính theo điểm ảnh thật. */
export interface MonitorInfo {
  key: string;
  index: number;
  name: string;
  width: number;
  height: number;
  x: number;
  y: number;
  primary: boolean;
}

/** Chọn màn hình mặc định: màn đã chọn lần trước → màn phụ đầu tiên → màn đầu tiên. */
export function pickMonitor(list: MonitorInfo[], savedKey: string | null): MonitorInfo | undefined {
  return list.find((m) => m.key === savedKey) ?? list.find((m) => !m.primary) ?? list[0];
}

export function monitorLabel(m: MonitorInfo): string {
  const name = m.name.replace(/^\\\\\.\\/, "");
  const role = m.primary ? "chính" : "phụ";
  return `Màn hình ${m.index} – ${m.width}×${m.height} (${role})${name ? ` · ${name}` : ""}`;
}

/** Trang này có phải là cửa sổ chiếu hay không. */
export function isOutputWindow(): boolean {
  return isTauri() ? getCurrentWebviewWindow().label === "output" : location.hash === "#output";
}

// --- Dự phòng khi chạy trong trình duyệt: màn chiếu là một cửa sổ bật lên ---
let popup: Window | null = null;

function subscribe(event: string, callback: () => void): () => void {
  let unlisten: (() => void) | undefined;
  let cancelled = false;
  getCurrentWebviewWindow()
    .listen(event, callback)
    .then((fn) => {
      if (cancelled) fn();
      else unlisten = fn;
    })
    .catch(() => {});
  return () => {
    cancelled = true;
    unlisten?.();
  };
}

export function listMonitors(): Promise<MonitorInfo[]> {
  return isTauri() ? invoke<MonitorInfo[]>("list_monitors") : Promise.resolve([]);
}

export function shouldAutoProject(): Promise<boolean> {
  return isTauri() ? invoke<boolean>("should_auto_project") : Promise.resolve(false);
}

/** Mở màn chiếu trên màn hình `monitorKey`; đã mở thì dời sang màn hình đó. */
export async function openOutput(monitorKey: string | null): Promise<void> {
  if (isTauri()) return invoke("open_output", { monitorKey });
  if (popup && !popup.closed) return;
  popup = window.open(
    `${location.href.split("#")[0]}#output`,
    "prompter_out",
    "popup=yes,width=1280,height=720",
  );
  if (!popup) throw new Error("Trình duyệt đã chặn cửa sổ bật lên.");
}

/** Tắt chiếu. Gọi được từ cả màn điều khiển lẫn màn chiếu. */
export async function closeOutput(): Promise<void> {
  if (isTauri()) return invoke("close_output");
  if (isOutputWindow()) window.close();
  else popup?.close();
}

export function onMonitorsChanged(callback: () => void): () => void {
  return isTauri() ? subscribe("monitors-changed", callback) : () => {};
}

export function onOutputClosed(callback: () => void): () => void {
  if (isTauri()) return subscribe("output-closed", callback);
  const timer = setInterval(() => {
    if (popup?.closed) {
      popup = null;
      callback();
    }
  }, 500);
  return () => clearInterval(timer);
}
