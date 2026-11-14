import { invoke, isTauri } from "@tauri-apps/api/core";

const DEFAULT_FILE_NAME = "kich-ban.txt";

/** Chọn file bằng thẻ input ẩn (chỉ dùng khi chạy trong trình duyệt). */
function pickInBrowser(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".txt,text/plain";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      file.text().then(resolve, () => resolve(null));
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}

function downloadInBrowser(text: string): void {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  a.download = DEFAULT_FILE_NAME;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** Mở một file `.txt` và trả về nội dung; `null` nếu người dùng hủy. */
export function openScriptFile(): Promise<string | null> {
  return isTauri() ? invoke<string | null>("open_script") : pickInBrowser();
}

/** Lưu kịch bản ra file `.txt`; `false` nếu người dùng hủy. */
export async function saveScriptFile(text: string): Promise<boolean> {
  if (isTauri()) return invoke<boolean>("save_script", { text });
  downloadInBrowser(text);
  return true;
}
