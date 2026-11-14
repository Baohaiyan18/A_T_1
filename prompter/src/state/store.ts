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

interface State {
  settings: Settings;
  text: string;
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
  setText: (text: string) => void;
  setPlayback: (playback: Playback) => void;
  setOutSize: (w: number, h: number) => void;
  setDisplayKey: (key: string | null) => void;
  setOutputOpen: (open: boolean) => void;
  setOutputConnected: (connected: boolean) => void;
}

export const useStore = create<State>()((set) => ({
  settings: DEFAULT_SETTINGS,
  text: SAMPLE_SCRIPT,
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
  setText: (text) => set({ text }),
  setPlayback: (playback) => set({ playback }),
  setOutSize: (w, h) => set({ outSize: { w, h } }),
  setDisplayKey: (displayKey) => set({ displayKey }),
  setOutputOpen: (outputOpen) => set({ outputOpen }),
  setOutputConnected: (outputConnected) => set({ outputConnected }),
}));
