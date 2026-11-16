import type { Storage } from "../bridge/storage";
import { SAMPLE_SCRIPT } from "../script/parse";
import { sanitizeSettings } from "../settings";
import { newTab, useStore } from "./store";
import type { ScriptTab } from "./store";

const KEY_SETTINGS = "settings";
/** Khóa của v0.2.0 (một kịch bản); chỉ đọc để chuyển đổi, không xóa để lùi phiên bản vẫn dùng được. */
const KEY_SCRIPT = "script";
const KEY_TABS = "tabs";
const KEY_DISPLAY = "display";
const SCRIPT_PERSIST_DEBOUNCE_MS = 400;

export interface SavedTabs {
  tabs: ScriptTab[];
  activeId: string;
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const nonNegative = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0);

/** Lọc dữ liệu tab đã lưu: bỏ tab hỏng hoặc trùng id; không còn tab nào thì trả `null`. */
export function sanitizeTabs(raw: unknown): SavedTabs | null {
  if (!isObject(raw) || !Array.isArray(raw.tabs)) return null;
  const tabs: ScriptTab[] = [];
  const seen = new Set<string>();
  for (const t of raw.tabs) {
    if (!isObject(t) || typeof t.id !== "string" || !t.id || seen.has(t.id)) continue;
    if (typeof t.text !== "string" || typeof t.name !== "string" || !t.name.trim()) continue;
    seen.add(t.id);
    tabs.push({
      id: t.id,
      name: t.name.trim(),
      text: t.text,
      pos: nonNegative(t.pos),
      targetSec: nonNegative(t.targetSec),
    });
  }
  if (!tabs.length) return null;
  const activeId =
    typeof raw.activeId === "string" && seen.has(raw.activeId) ? raw.activeId : tabs[0].id;
  return { tabs, activeId };
}

/** Tab nạp lúc mở app: dữ liệu `tabs`, nếu không có thì chuyển từ kịch bản cũ, cuối cùng là mặc định. */
function loadTabs(rawTabs: unknown, rawText: unknown): SavedTabs | null {
  const saved = sanitizeTabs(rawTabs);
  if (saved) return saved;
  if (typeof rawText !== "string") return null;
  const tab = newTab("Kịch bản 1", rawText);
  return { tabs: [tab], activeId: tab.id };
}

export interface PersistOptions {
  /** Trễ lưu kịch bản (ms) để tránh ghi đĩa mỗi lần gõ phím. */
  scriptDebounceMs?: number;
}

/**
 * Nạp cài đặt, các tab kịch bản và màn hình đã chọn vào store, rồi ghi lại mỗi khi chúng thay đổi.
 * Chưa có gì được lưu thì dùng cài đặt mặc định và kịch bản mẫu.
 */
export async function initPersistence(
  storage: Storage,
  options: PersistOptions = {},
): Promise<() => void> {
  const debounceMs = options.scriptDebounceMs ?? SCRIPT_PERSIST_DEBOUNCE_MS;
  const [rawSettings, rawTabs, rawText, rawDisplay] = await Promise.all([
    storage.get(KEY_SETTINGS),
    storage.get(KEY_TABS),
    storage.get(KEY_SCRIPT),
    storage.get(KEY_DISPLAY),
  ]);
  const first = newTab("Kịch bản 1", SAMPLE_SCRIPT);
  useStore.setState({
    settings: sanitizeSettings(rawSettings),
    ...(loadTabs(rawTabs, rawText) ?? { tabs: [first], activeId: first.id }),
    displayKey: typeof rawDisplay === "string" ? rawDisplay : null,
  });

  let scriptTimer: ReturnType<typeof setTimeout> | undefined;

  const writeTabs = () => {
    const { tabs, activeId } = useStore.getState();
    void storage.set(KEY_TABS, { tabs, activeId } satisfies SavedTabs);
  };

  const flushScript = () => {
    if (scriptTimer === undefined) return;
    clearTimeout(scriptTimer);
    scriptTimer = undefined;
    writeTabs();
  };

  const unsubscribe = useStore.subscribe((state, prev) => {
    if (state.settings !== prev.settings) void storage.set(KEY_SETTINGS, state.settings);
    if (state.displayKey !== prev.displayKey) void storage.set(KEY_DISPLAY, state.displayKey);
    if (state.tabs !== prev.tabs || state.activeId !== prev.activeId) {
      if (debounceMs <= 0) {
        writeTabs();
      } else {
        clearTimeout(scriptTimer);
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
