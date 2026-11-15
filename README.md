<div align="center">
  <img src="prompter/public/logo.png" alt="Prompter Logo" width="96" height="96" />
  <h1>Prompter</h1>
  <p><strong>Phần mềm máy nhắc chữ chuyên nghiệp cho MC, quay dựng và phát sóng trực tiếp</strong></p>
  <p>
    <img alt="Tauri 2" src="https://img.shields.io/badge/Tauri-2-24C8D8?logo=tauri&logoColor=white" />
    <img alt="React 19" src="https://img.shields.io/badge/React-19-5664AE?logo=react&logoColor=white" />
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-6-00B3E4?logo=typescript&logoColor=white" />
    <img alt="Rust" src="https://img.shields.io/badge/Rust-2024-F2664E?logo=rust&logoColor=white" />
    <img alt="Windows x64" src="https://img.shields.io/badge/Platform-Windows%20x64-8FC84F?logo=windows&logoColor=white" />
  </p>
</div>

---

## ✨ Tính năng nổi bật

- **Hai cửa sổ độc lập (Điều khiển & Màn chiếu):** Soạn thảo, xem trước và tinh chỉnh thông số ở màn điều khiển trong khi xuất toàn màn hình mượt mà ra màn hình nhắc chữ ngoài (hoặc cửa sổ riêng).
- **Trình soạn thảo kịch bản trực quan:**
  - Hỗ trợ mở / lưu tệp `.txt` (hỗ trợ tiếng Việt UTF-8, tự xử lý BOM) và tự động lưu trên máy.
  - Đánh dấu cú pháp trực tiếp trên màn chiếu: dòng bắt đầu bằng `##` làm **tiêu đề** (màu xanh Cyan), nội dung trong `[ngoặc vuông]` làm **ghi chú dàn dựng** (màu vàng Amber).
  - Nhấn `Ctrl + Enter` để nhảy và chạy ngay từ dòng đang đặt con trỏ.
- **Xem trước & điều khiển chính xác:**
  - Khung **Xem trước** đồng bộ đúng tỉ lệ màn chiếu thật (không lật gương), nhấp vào dòng bất kỳ để đưa lên vạch đọc hoặc lăn chuột để cuộn tay.
  - Thanh tua theo phần trăm kèm thời gian còn lại ước tính (`MM:SS`) và đếm ngược trước khi chạy (`Tắt`, `3 giây`, `5 giây`).
- **Tùy biến hiển thị toàn diện:**
  - Chỉnh tốc độ chạy chữ (`0 – 60`), cỡ chữ (`24 – 260px`), giãn dòng (`1.0 – 2.2`), lề hai bên (`0 – 35%`), vị trí vạch đọc (`10 – 70%`), căn trái/giữa, chữ in hoa, lật gương ngang/dọc cho máy nhắc chữ có kính phản chiếu.
  - Bộ chọn màu HSV + lưới lục giác tổ ong (`ColorPicker`) kèm danh sách màu đã lưu cho màu chữ, màu nền, ghi chú và tiêu đề.
- **Giao diện Sáng / Tối đồng bộ thương hiệu:**
  - Thiết kế trên **Meta Astryx UI** với bảng màu trích xuất từ logo 6 cánh (**Indigo** `#5664ae` cho chế độ Sáng, **Cyan** `#00b3e4` cho chế độ Tối, kết hợp **Coral / Green / Amber** đạt chuẩn tương phản WCAG AA).
  - Kéo thả linh hoạt tỷ lệ 3 vùng làm việc (kịch bản, xem trước, cài đặt).

---

## ⌨️ Phím tắt

| Phím tắt | Tác dụng |
|---|---|
| `Space` | Chạy / Dừng cuộn chữ |
| `↑` / `↓` | Tăng / giảm tốc độ (giữ `Shift` để tăng/giảm ×5) |
| `←` / `→` | Lùi / tới 1 dòng |
| `PgUp` / `PgDn` | Lùi / tới 3 dòng |
| `Home` | Quay về đầu kịch bản |
| `+` / `-` | Tăng / giảm cỡ chữ (trên màn điều khiển) |
| `Ctrl + Enter` | Đưa dòng tại con trỏ trong ô kịch bản lên vạch đọc |
| `Esc` | Tắt màn hình chiếu (khi đang ở màn chiếu) |

---

## 📦 Tải về & Cài đặt (Windows)

Truy cập mục **[Releases](../../releases)** để tải bộ cài đặt Windows mới nhất:

- `Prompter_<version>_x64-setup.exe` — Bộ cài đặt NSIS cho Windows 64-bit.
- `prompter.exe` — Tệp thực thi trực tiếp (portable).

---

## 🛠️ Kiến trúc dự án

```text
prompter/
├── public/                 # Logo thương hiệu (logo.png)
├── src/
│   ├── engine/             # Lõi tính toán cuộn chữ & tốc độ (thuần TS, độc lập React)
│   ├── script/             # Bộ phân tích cú pháp kịch bản (## tiêu đề, [ghi chú])
│   ├── windows/            # ControlWindow (điều khiển) & OutputWindow (màn chiếu)
│   ├── components/         # ScriptEditor, Preview, Stage, Transport, SettingsPanel, ColorPicker...
│   ├── bridge/             # Lớp giao tiếp Tauri IPC & fallback trình duyệt
│   ├── state/              # Zustand store, lưu trữ cài đặt, themeMode & updater
│   └── theme.ts            # Định nghĩa prompterTheme đồng bộ màu logo
└── src-tauri/
    └── src/                # Backend Rust: monitors.rs, output.rs, script_io.rs, update.rs
```

---

## 🚀 Phát triển & Biên dịch từ mã nguồn

### Yêu cầu môi trường
- **Node.js** LTS & npm
- **Rust** (`stable`) & Cargo
- **Microsoft C++ Build Tools** & **WebView2** (có sẵn trên Windows 10/11)

### Các lệnh thường dùng

```bash
cd prompter
npm install

# Chạy ứng dụng desktop ở chế độ dev
npm run tauri dev

# Chạy chỉ giao diện web để kiểm thử nhanh (http://localhost:1420)
npm run dev

# Kiểm thử & kiểm tra chất lượng mã nguồn
npm test
npm run lint
npm run build

# Kiểm thử phần Rust
cargo test --manifest-path src-tauri/Cargo.toml

# Đóng gói file .exe và bộ cài NSIS cho Windows
npm run tauri build
```

Sau khi chạy `npm run tauri build`, sản phẩm biên dịch nằm tại:
- `prompter/src-tauri/target/release/prompter.exe`
- `prompter/src-tauri/target/release/bundle/nsis/Prompter_0.1.0_x64-setup.exe`

---

<div align="center">
  <sub>Xây dựng bằng Tauri 2 · React 19 · TypeScript · Meta Astryx</sub>
</div>
