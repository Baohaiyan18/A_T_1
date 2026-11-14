import { invoke, isTauri } from "@tauri-apps/api/core";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";

export interface UpdateInfo {
  version: string;
  current_version: string;
  /** Ghi chú phát hành. */
  notes: string | null;
  /** Bản bắt buộc: người dùng không được hoãn. */
  mandatory: boolean;
}

export interface UpdateApi {
  /** Hỏi máy chủ; `null` nếu đang dùng bản mới nhất. */
  check(): Promise<UpdateInfo | null>;
  /** Tải và cài bản vừa tìm thấy; ứng dụng tự khởi động lại khi xong. */
  install(onProgress: (done: number, total: number | null) => void): Promise<void>;
}

/** Bản ứng dụng gọi lệnh Rust; chạy trong trình duyệt thì coi như không có bản mới. */
export const updateApi: UpdateApi = {
  check() {
    return isTauri() ? invoke<UpdateInfo | null>("check_update") : Promise.resolve(null);
  },
  async install(onProgress) {
    if (!isTauri()) return;
    const unlisten = await getCurrentWebviewWindow().listen<{ done: number; total: number | null }>(
      "update-progress",
      (e) => onProgress(e.payload.done, e.payload.total),
    );
    try {
      await invoke("install_update");
    } finally {
      unlisten();
    }
  },
};
