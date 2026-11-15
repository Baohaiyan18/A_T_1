import { invoke, isTauri } from "@tauri-apps/api/core";
import { DEFAULT_SETTINGS, FONTS, sanitizeFont } from "../settings";

/** Lấy danh sách font hệ thống trong Tauri; dùng danh sách dự phòng khi chạy trình duyệt. */
export function listFonts(): Promise<string[]> {
  return isTauri() ? invoke<string[]>("list_fonts") : Promise.resolve(FONTS);
}

/**
 * Gộp danh sách font hệ thống với font mặc định của ứng dụng (`Roboto`) và font đang chọn
 * để giá trị đã lưu luôn hiển thị được trong bộ chọn kể cả khi chưa quét xong hoặc font đã gỡ.
 */
export function mergeFonts(systemFonts: string[], currentFont?: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const add = (raw: string | undefined) => {
    const name = sanitizeFont(raw, "");
    if (!name) return;
    const key = name.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(name);
  };

  add(DEFAULT_SETTINGS.font);
  for (const f of systemFonts.length > 0 ? systemFonts : FONTS) add(f);
  add(currentFont);

  return out.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}
