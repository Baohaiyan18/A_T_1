import { create } from "zustand";
import { clamp } from "../lib/clamp";
import { SAMPLE_SCRIPT } from "../script/parse";
import { DEFAULT_SETTINGS, RANGES } from "../settings";
import type { Settings } from "../settings";

/** Thông tin chạy chữ hiển thị trên giao diện, cập nhật vài lần mỗi giây. */
export interface Playback {
  running: boolean;
  /** Tiến độ 0..1. */
  progress: number;
  /** Số giây còn lại; `null` khi tốc độ bằng 0. */
  secondsLeft: number | null;
}

/** Một tab kịch bản. */
export interface ScriptTab {
  id: string;
  name: string;
  text: string;
  /** Vị trí đọc đã lưu khi rời tab (px màn chiếu). */
  pos: number;
  /** Mốc giờ (giây), dùng cho đồng hồ; 0 = tắt đếm ngược. */
  targetSec: number;
}

const NAME_PREFIX = "Kịch bản ";

/** Tên mặc định chưa dùng: "Kịch bản 1", "Kịch bản 2"… */
export function nextTabName(tabs: ScriptTab[]): string {
  const used = new Set(tabs.map((t) => t.name));
  let n = 1;
  while (used.has(NAME_PREFIX + n)) n++;
  return NAME_PREFIX + n;
}

export function newTab(name: string, text = ""): ScriptTab {
  return { id: crypto.randomUUID(), name, text, pos: 0, targetSec: 0 };
}

/** Tab được chọn khi đóng tab `id`: tab bên phải, hết thì tab bên trái. */
export function neighborId(tabs: ScriptTab[], id: string): string {
  const i = tabs.findIndex((t) => t.id === id);
  return (tabs[i + 1] ?? tabs[i - 1] ?? tabs[0]).id;
}

export function activeTab(s: { tabs: ScriptTab[]; activeId: string }): ScriptTab {
  return s.tabs.find((t) => t.id === s.activeId) ?? s.tabs[0];
}

interface State {
  settings: Settings;
  /** Luôn có ít nhất một tab. */
  tabs: ScriptTab[];
  activeId: string;
  /** Kích thước màn chiếu (px), dùng để giữ đúng tỉ lệ cho khung xem trước. */
  outSize: { w: number; h: number };
  playback: Playback;
  /** Khóa màn hình đã chọn để chiếu; `null` khi chưa chọn. */
  displayKey: string | null;
  /** Cửa sổ chiếu đang mở. */
  outputOpen: boolean;
  /** Màn chiếu vừa báo vị trí về (đang hoạt động). */
  outputConnected: boolean;
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  setSpeed: (value: number) => void;
  setFontSize: (value: number) => void;
  /** Sửa nội dung tab đang chọn. */
  setText: (text: string) => void;
  /** Thêm tab ở cuối (không tự chọn); tên rỗng thì dùng tên mặc định. Trả về id. */
  addTab: (name?: string, text?: string) => string;
  /** Đóng tab; không đóng tab cuối cùng. Đóng tab đang chọn thì chọn tab kề bên. */
  closeTab: (id: string) => void;
  renameTab: (id: string, name: string) => void;
  selectTab: (id: string) => void;
  setTabPos: (id: string, pos: number) => void;
  setPlayback: (playback: Playback) => void;
  setOutSize: (w: number, h: number) => void;
  setDisplayKey: (key: string | null) => void;
  setOutputOpen: (open: boolean) => void;
  setOutputConnected: (connected: boolean) => void;
}

const firstTab = newTab(NAME_PREFIX + 1, SAMPLE_SCRIPT);

const patchTab = (tabs: ScriptTab[], id: string, patch: Partial<ScriptTab>) =>
  tabs.map((t) => (t.id === id ? { ...t, ...patch } : t));

export const useStore = create<State>()((set, get) => ({
  settings: DEFAULT_SETTINGS,
  tabs: [firstTab],
  activeId: firstTab.id,
  outSize: { w: 1920, h: 1080 },
  playback: { running: false, progress: 0, secondsLeft: null },
  displayKey: null,
  outputOpen: false,
  outputConnected: false,
  setSetting: (key, value) => set((s) => ({ settings: { ...s.settings, [key]: value } })),
  setSpeed: (value) =>
    set((s) => ({
      settings: {
        ...s.settings,
        speed: clamp(Math.round(value * 2) / 2, RANGES.speed.min, RANGES.speed.max),
      },
    })),
  setFontSize: (value) =>
    set((s) => ({
      settings: {
        ...s.settings,
        fontSize: clamp(value, RANGES.fontSize.min, RANGES.fontSize.max),
      },
    })),
  setText: (text) => set((s) => ({ tabs: patchTab(s.tabs, s.activeId, { text }) })),
  addTab: (name, text) => {
    const tab = newTab(name?.trim() || nextTabName(get().tabs), text);
    set((s) => ({ tabs: [...s.tabs, tab] }));
    return tab.id;
  },
  closeTab: (id) =>
    set((s) => {
      if (s.tabs.length <= 1 || !s.tabs.some((t) => t.id === id)) return {};
      const activeId = id === s.activeId ? neighborId(s.tabs, id) : s.activeId;
      return { tabs: s.tabs.filter((t) => t.id !== id), activeId };
    }),
  renameTab: (id, name) => {
    const trimmed = name.trim();
    if (trimmed) set((s) => ({ tabs: patchTab(s.tabs, id, { name: trimmed }) }));
  },
  selectTab: (id) => {
    if (get().tabs.some((t) => t.id === id)) set({ activeId: id });
  },
  setTabPos: (id, pos) => set((s) => ({ tabs: patchTab(s.tabs, id, { pos }) })),
  setPlayback: (playback) => set({ playback }),
  setOutSize: (w, h) => set({ outSize: { w, h } }),
  setDisplayKey: (displayKey) => set({ displayKey }),
  setOutputOpen: (outputOpen) => set({ outputOpen }),
  setOutputConnected: (outputConnected) => set({ outputConnected }),
}));

/** Nội dung tab đang chọn. */
export const useActiveText = () => useStore((s) => activeTab(s).text);
