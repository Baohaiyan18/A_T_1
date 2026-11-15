import { create } from "zustand";

export type ThemeMode = "light" | "dark";

const THEME_MODE_KEY = "prompter.themeMode";

function readInitialMode(): ThemeMode {
  try {
    const saved = localStorage.getItem(THEME_MODE_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // localStorage không dùng được: theo hệ điều hành.
  }
  if (typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches)
    return "dark";
  return "light";
}

interface ThemeModeState {
  mode: ThemeMode;
  toggle: () => void;
}

/** Chế độ Sáng/Tối của màn điều khiển, lưu riêng trên máy (không cần đồng bộ sang màn chiếu). */
export const useThemeMode = create<ThemeModeState>()((set, get) => ({
  mode: readInitialMode(),
  toggle: () => {
    const mode: ThemeMode = get().mode === "dark" ? "light" : "dark";
    try {
      localStorage.setItem(THEME_MODE_KEY, mode);
    } catch {
      // Bỏ qua nếu không lưu được; chế độ vẫn đổi trong phiên hiện tại.
    }
    set({ mode });
  },
}));
