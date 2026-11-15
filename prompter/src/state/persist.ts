import type { Storage } from "../bridge/storage";
import { SAMPLE_SCRIPT } from "../script/parse";
import { sanitizeSettings } from "../settings";
import { useStore } from "./store";

const KEY_SETTINGS = "settings";
const KEY_SCRIPT = "script";
const KEY_DISPLAY = "display";
const SCRIPT_PERSIST_DEBOUNCE_MS = 400;

export interface PersistOptions {
  /** Trễ lưu kịch bản (ms) để tránh ghi đĩa mỗi lần gõ phím. */
  scriptDebounceMs?: number;
}

/**
 * Nạp cài đặt, kịch bản và màn hình đã chọn vào store, rồi ghi lại mỗi khi chúng thay đổi.
 * Chưa có gì được lưu thì dùng cài đặt mặc định và kịch bản mẫu.
 */
export async function initPersistence(
  storage: Storage,
  options: PersistOptions = {},
): Promise<() => void> {
  const debounceMs = options.scriptDebounceMs ?? SCRIPT_PERSIST_DEBOUNCE_MS;
  const [rawSettings, rawText, rawDisplay] = await Promise.all([
    storage.get(KEY_SETTINGS),
    storage.get(KEY_SCRIPT),
    storage.get(KEY_DISPLAY),
  ]);
  useStore.setState({
    settings: sanitizeSettings(rawSettings),
    text: typeof rawText === "string" ? rawText : SAMPLE_SCRIPT,
    displayKey: typeof rawDisplay === "string" ? rawDisplay : null,
  });

  let scriptTimer: ReturnType<typeof setTimeout> | undefined;
  let pendingText: string | undefined;

  const flushScript = () => {
    if (scriptTimer === undefined) return;
    clearTimeout(scriptTimer);
    scriptTimer = undefined;
    if (pendingText !== undefined) {
      const value = pendingText;
      pendingText = undefined;
      void storage.set(KEY_SCRIPT, value);
    }
  };

  const unsubscribe = useStore.subscribe((state, prev) => {
    if (state.settings !== prev.settings) void storage.set(KEY_SETTINGS, state.settings);
    if (state.displayKey !== prev.displayKey) void storage.set(KEY_DISPLAY, state.displayKey);
    if (state.text !== prev.text) {
      if (debounceMs <= 0) {
        void storage.set(KEY_SCRIPT, state.text);
      } else {
        clearTimeout(scriptTimer);
        pendingText = state.text;
        scriptTimer = setTimeout(flushScript, debounceMs);
      }
    }
  });

  if (typeof window !== "undefined") {
    window.addEventListener("pagehide", flushScript);
    window.addEventListener("beforeunload", flushScript);
  }

  return () => {
    flushScript();
    unsubscribe();
    if (typeof window !== "undefined") {
      window.removeEventListener("pagehide", flushScript);
      window.removeEventListener("beforeunload", flushScript);
    }
  };
}

const KEY_LAST_VERSION = "lastVersion";

/**
 * Ghi lại phiên bản đang chạy và cho biết ứng dụng có vừa được cập nhật hay không
 * (phiên bản khác với lần chạy trước).
 */
export async function noteVersion(storage: Storage, version: string): Promise<boolean> {
  const last = await storage.get(KEY_LAST_VERSION);
  if (last === version) return false;
  await storage.set(KEY_LAST_VERSION, version);
  return typeof last === "string";
}
