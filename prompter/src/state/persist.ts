import type { Storage } from "../bridge/storage";
import { SAMPLE_SCRIPT } from "../script/parse";
import { sanitizeSettings } from "../settings";
import { useStore } from "./store";

const KEY_SETTINGS = "settings";
const KEY_SCRIPT = "script";
const KEY_DISPLAY = "display";

/**
 * Nạp cài đặt, kịch bản và màn hình đã chọn vào store, rồi ghi lại mỗi khi chúng thay đổi.
 * Chưa có gì được lưu thì dùng cài đặt mặc định và kịch bản mẫu.
 */
export async function initPersistence(storage: Storage): Promise<void> {
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

  useStore.subscribe((state, prev) => {
    if (state.settings !== prev.settings) void storage.set(KEY_SETTINGS, state.settings);
    if (state.text !== prev.text) void storage.set(KEY_SCRIPT, state.text);
    if (state.displayKey !== prev.displayKey) void storage.set(KEY_DISPLAY, state.displayKey);
  });
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
