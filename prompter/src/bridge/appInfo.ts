import { invoke, isTauri } from "@tauri-apps/api/core";

export interface AppInfo {
  version: string;
  /** Phiên bản Tauri. */
  tauri: string;
  /** Phiên bản WebView của hệ điều hành. */
  webview: string;
}

/** Thông tin ứng dụng; `null` khi chạy trong trình duyệt. */
export function getAppInfo(): Promise<AppInfo | null> {
  return isTauri() ? invoke<AppInfo>("app_info") : Promise.resolve(null);
}
