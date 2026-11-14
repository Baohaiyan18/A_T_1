import { createStore } from "zustand/vanilla";
import type { UpdateApi, UpdateInfo } from "../bridge/update";

export type UpdatePhase = "idle" | "checking" | "uptodate" | "available" | "downloading" | "error";

export interface UpdaterState {
  phase: UpdatePhase;
  /** Bản mới tìm thấy ở lần kiểm tra gần nhất. */
  info: UpdateInfo | null;
  error: string;
  progress: { done: number; total: number | null };
  dialogOpen: boolean;
  /** Kiểm tra cập nhật. `manual`: do người dùng bấm (hiện hộp thoại và báo lỗi). */
  check: (manual: boolean) => Promise<void>;
  /** Mở hộp thoại để xem bản mới đã tìm thấy. */
  show: () => void;
  /** Đóng hộp thoại; không có tác dụng khi đang tải hoặc bản mới là bắt buộc. */
  dismiss: () => void;
  install: () => Promise<void>;
}

const message = (err: unknown) => (err instanceof Error ? err.message : String(err));

export function createUpdaterStore(api: UpdateApi) {
  // Phiên bản bắt buộc đã tự mở hộp thoại, để không mở lại sau mỗi lần kiểm tra định kỳ.
  let shownMandatory = "";

  return createStore<UpdaterState>()((set, get) => ({
    phase: "idle",
    info: null,
    error: "",
    progress: { done: 0, total: null },
    dialogOpen: false,

    async check(manual) {
      const before = get().phase;
      if (before === "checking" || before === "downloading") return;
      if (manual) set({ phase: "checking", dialogOpen: true, error: "" });
      try {
        const info = await api.check();
        if (!info) {
          set({ info: null, phase: manual ? "uptodate" : "idle" });
          return;
        }
        const autoOpen = info.mandatory && shownMandatory !== info.version;
        if (info.mandatory) shownMandatory = info.version;
        set({ info, phase: "available", ...(manual || autoOpen ? { dialogOpen: true } : {}) });
      } catch (err) {
        // Kiểm tra tự động thất bại thì im lặng, giữ nguyên trạng thái trước đó.
        if (manual) set({ phase: "error", error: message(err) });
      }
    },

    show() {
      if (get().info) set({ phase: "available", dialogOpen: true });
    },

    dismiss() {
      const { phase, info } = get();
      if (phase === "downloading" || phase === "checking") return;
      if (phase === "available" && info?.mandatory) return;
      set({ dialogOpen: false, phase: info ? "available" : "idle" });
    },

    async install() {
      if (get().phase !== "available") return;
      set({ phase: "downloading", progress: { done: 0, total: null }, dialogOpen: true });
      try {
        await api.install((done, total) => set({ progress: { done, total } }));
      } catch (err) {
        // Bản đã tìm thấy không dùng lại được sau khi cài lỗi; phải kiểm tra lại.
        set({ phase: "error", error: message(err), info: null });
      }
    },
  }));
}
