import { isTauri } from "@tauri-apps/api/core";
import { load } from "@tauri-apps/plugin-store";

/** Kho khóa–giá trị lưu trên máy. Giá trị phải chuyển được sang JSON. */
export interface Storage {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
}

const FILE = "prompter.json";

/** Bản ứng dụng: file JSON trong thư mục dữ liệu, ghi đĩa trễ 200 ms sau thay đổi cuối. */
async function tauriStorage(): Promise<Storage> {
  const store = await load(FILE, { autoSave: 200 });
  return {
    get: (key) => store.get(key),
    set: (key, value) => store.set(key, value),
  };
}

/** Chạy trong trình duyệt (`npm run dev`): dùng localStorage. */
function browserStorage(): Storage {
  const name = (key: string) => `prompter.${key}`;
  return {
    async get(key) {
      try {
        const raw = localStorage.getItem(name(key));
        return raw === null ? undefined : JSON.parse(raw);
      } catch {
        return undefined;
      }
    },
    async set(key, value) {
      try {
        localStorage.setItem(name(key), JSON.stringify(value));
      } catch {
        // hết dung lượng hoặc bị chặn: bỏ qua, ứng dụng vẫn chạy với dữ liệu trong bộ nhớ
      }
    },
  };
}

let opened: Promise<Storage> | undefined;

/** Mở kho lưu trữ (dùng chung một kho cho cả cửa sổ). */
export function openStorage(): Promise<Storage> {
  return (opened ??= isTauri() ? tauriStorage() : Promise.resolve(browserStorage()));
}
