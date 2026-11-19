<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="prompter/public/brand-dark.png" />
    <img src="prompter/public/brand-light.png" alt="Rec Media" height="64" />
  </picture>
  <p><strong>Phần mềm máy nhắc chữ cho MC, quay dựng và phát sóng trực tiếp</strong></p>
  <p>
    <img alt="Tauri 2" src="https://img.shields.io/badge/Tauri-2-BE1F2C?logo=tauri&logoColor=white" />
    <img alt="React 19" src="https://img.shields.io/badge/React-19-BE1F2C?logo=react&logoColor=white" />
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-6-111111?logo=typescript&logoColor=white" />
    <img alt="Rust" src="https://img.shields.io/badge/Rust-2024-111111?logo=rust&logoColor=white" />
    <img alt="Windows x64" src="https://img.shields.io/badge/Windows-x64-111111?logo=windows&logoColor=white" />
  </p>
</div>

---

## Tính năng

### Hai cửa sổ: điều khiển và màn chiếu
Soạn kịch bản, xem trước và chỉnh thông số trên màn điều khiển; chữ chạy toàn màn hình trên màn hình
nhắc chữ (màn hình thứ hai hoặc cửa sổ riêng). Màn chiếu tự lật gương cho máy nhắc chữ có kính.

### Soạn kịch bản trực quan
- Ô soạn thảo hiện luôn màu, chữ đậm, chữ nghiêng giống trên màn chiếu, không cần gõ ký hiệu.
- **Bôi đen chữ rồi bấm nút** phía trên: **B** (đậm), **I** (nghiêng), 5 màu nhấn (đỏ, cam, vàng,
  xanh lá, xanh dương) hoặc bỏ màu. Nút sáng lên cho biết đoạn đang chọn đang có định dạng gì.
- Dòng bắt đầu bằng `## ` là **tiêu đề**; chữ trong `[ngoặc vuông]` là **ghi chú dàn dựng** (MC không đọc).
- **Nhiều tab kịch bản**, đặt tên theo số `1`, `2`…; mỗi tab nhớ vị trí đọc, tự lưu trên máy. Nhấp đúp
  tên tab để đổi tên.
- Mở / lưu file `.txt` (UTF-8, tiếng Việt). Định dạng được lưu trong file dạng `{1}chữ{/}`…`{5}chữ{/}`,
  `**đậm**`, `*nghiêng*`, nên file cũ vẫn mở đúng; dán chữ có các thẻ này vào ô soạn thảo cũng giữ định dạng.

### Xem trước và điều khiển
- Khung **Xem trước** đúng tỉ lệ màn chiếu. Nhấp vào dòng để đưa dòng đó lên vạch đọc, lăn chuột để cuộn.
- **Nhấp đúp vào dòng để sửa chữ ngay trên khung xem trước**: Enter hoặc bấm ra ngoài để lưu, Esc để hủy.
- Thanh tiến độ kèm thời gian còn lại ước tính, đếm ngược trước khi chạy (tắt / 3 / 5 giây), thanh
  tốc độ cạnh nút **CHẠY**.

### Chữ chạy
- Thêm nhiều lớp chữ chạy đè lên màn chiếu; mỗi lớp bật/tắt, sửa, xóa bất kỳ lúc nào, kể cả khi đang chiếu.
- Chạy ngang (phải → trái) hoặc dọc (dưới → lên); chỉnh tốc độ, cỡ chữ, độ dài dải, màu chữ, màu nền.
- Lặp vô hạn hoặc chạy 1–50 lượt rồi tự ẩn; nút **Chạy lại** để chạy lại từ đầu.
- Kéo dải chữ trên khung xem trước để đặt ở vị trí bất kỳ.

### Tùy biến hiển thị
- Nhấn **Esc** (hoặc nút ⚙ trên khung Xem trước) để bật/tắt ngăn **Cài đặt hiển thị**.
- Cỡ chữ, giãn dòng, lề, vị trí vạch đọc, font (gồm font cài trên máy), căn trái/giữa, chữ in hoa,
  lật gương ngang/dọc; màu chữ, nền, tiêu đề, ghi chú và 5 màu nhấn.
- Giao diện Sáng / Tối theo màu nhận diện Rec Media; tự kiểm tra và cài bản cập nhật.

---

## Phím tắt

| Phím | Tác dụng |
|---|---|
| `Space` | Chạy / dừng |
| `↑` / `↓` | Tăng / giảm tốc độ (giữ `Shift`: ×5) |
| `←` / `→` | Lùi / tới 1 dòng |
| `PgUp` / `PgDn` | Lùi / tới 3 dòng |
| `Home` | Về đầu kịch bản |
| `+` / `-` | Tăng / giảm cỡ chữ |
| `Ctrl + Enter` | Đưa dòng đang đặt con trỏ lên vạch đọc |
| `Ctrl + B` / `Ctrl + I` | Đậm / nghiêng đoạn đang chọn |
| `Ctrl + Z` / `Ctrl + Y` | Hoàn tác / làm lại trong ô soạn thảo |
| `Esc` | Bật / tắt Cài đặt hiển thị; trên màn chiếu: tắt chiếu |

---

## Tải về (Windows)

Vào **[Releases](../../releases)** và tải `Prompter_<phiên bản>_x64-setup.exe` (bộ cài Windows 64-bit).
Bản đã cài tự báo khi có phiên bản mới.

---

## Phát triển

Cần **Node.js** LTS, **Rust** stable, **Microsoft C++ Build Tools** và **WebView2** (có sẵn trên
Windows 10/11).

```bash
cd prompter
npm install
npm run tauri dev      # chạy ứng dụng
npm run dev            # chỉ giao diện trong trình duyệt (http://localhost:1420, màn chiếu ở #output)
npm test               # test frontend
npm run lint
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
npm run tauri build    # đóng gói bộ cài NSIS
```

Phát hành: đẩy thẻ `vX.Y.Z` lên GitHub, workflow **Release** build bộ cài có chữ ký cập nhật và tạo
bản phát hành nháp.

### Cấu trúc

```text
prompter/
├── public/          # Logo Rec Media
├── src/
│   ├── engine/      # Lõi cuộn chữ và tốc độ (thuần TS)
│   ├── script/      # Phân tích kịch bản, mô hình ô soạn thảo trực quan (richText.ts)
│   ├── windows/     # ControlWindow (điều khiển), OutputWindow (màn chiếu)
│   ├── components/  # RichEditor, Preview, PreviewLineEditor, Stage, TickerLayer, TickerPanel…
│   ├── bridge/      # Giao tiếp Tauri, có nhánh dự phòng cho trình duyệt
│   ├── state/       # Store Zustand, lưu trữ, cập nhật
│   ├── ticker.ts    # Dữ liệu và bước chạy của chữ chạy
│   └── theme.ts     # Theme màu Rec Media
└── src-tauri/src/   # Rust: màn hình, cửa sổ chiếu, file kịch bản, cập nhật, font
```

---

<div align="center">
  <sub>Rec Media · Tauri 2 · React 19 · TypeScript</sub>
</div>
