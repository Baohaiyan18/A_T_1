import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { isOutputWindow } from "./bridge/projection";
import { openStorage } from "./bridge/storage";
import { initPersistence } from "./state/persist";

async function start() {
  // Màn chiếu nhận kịch bản và cài đặt từ màn điều khiển, không tự đọc dữ liệu đã lưu.
  if (!isOutputWindow()) {
    try {
      await initPersistence(await openStorage());
    } catch (err) {
      // Không đọc được dữ liệu đã lưu: vẫn mở ứng dụng với cài đặt mặc định.
      console.error("Không nạp được dữ liệu đã lưu", err);
    }
  }
  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

void start();
