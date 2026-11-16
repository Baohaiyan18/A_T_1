import { invoke, isTauri } from "@tauri-apps/api/core";

const DEFAULT_FILE_NAME = "kich-ban";

/** Kịch bản đọc từ file: tên file (bỏ đuôi) và nội dung. */
export interface OpenedScript {
  name: string;
  text: string;
}

/** Tên file gợi ý khi lưu: tên tab bỏ các ký tự Windows không cho phép, thêm đuôi `.txt`. */
export function fileNameFor(tabName: string): string {
  const safe = tabName.replace(/[\\/:*?"<>|]/g, "-").trim();
  return `${safe || DEFAULT_FILE_NAME}.txt`;
}

const stripExt = (fileName: string) => fileName.replace(/\.[^.]*$/, "") || fileName;

/** Chọn file bằng thẻ input ẩn (chỉ dùng khi chạy trong trình duyệt). */
function pickInBrowser(): Promise<OpenedScript | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".txt,text/plain";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      file.text().then(
        (text) => resolve({ name: stripExt(file.name), text }),
        () => resolve(null),
      );
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}

function downloadInBrowser(text: string, fileName: string): void {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** Mở một file `.txt` và trả về tên + nội dung; `null` nếu người dùng hủy. */
export function openScriptFile(): Promise<OpenedScript | null> {
  return isTauri() ? invoke<OpenedScript | null>("open_script") : pickInBrowser();
}

/** Lưu kịch bản ra file `.txt`, gợi ý tên file theo tên tab; `false` nếu người dùng hủy. */
export async function saveScriptFile(text: string, tabName: string): Promise<boolean> {
  const fileName = fileNameFor(tabName);
  if (isTauri()) return invoke<boolean>("save_script", { text, fileName });
  downloadInBrowser(text, fileName);
  return true;
}
