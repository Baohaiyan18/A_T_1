# Prompter

Phần mềm máy nhắc chữ: soạn kịch bản, điều khiển tốc độ và chiếu toàn màn hình ra màn hình nhắc chữ.
Xây bằng Tauri 2 (Rust) và React + TypeScript.

## Sử dụng

**Cú pháp kịch bản** (màu, đậm, nghiêng chỉ có hiệu lực trong một dòng):

| Cú pháp | Hiển thị |
|---|---|
| `## Tiêu đề` | Dòng tiêu đề |
| `[ghi chú]` | Ghi chú dàn dựng (luôn dùng màu ghi chú) |
| `{1}chữ{/}` … `{5}chữ{/}` | Màu nhấn 1 đỏ · 2 cam · 3 vàng · 4 xanh lá · 5 xanh dương; thiếu `{/}` thì tự đóng cuối dòng |
| `**chữ**` / `*chữ*` | Đậm / nghiêng |

- **Tab kịch bản:** mỗi tab nhớ vị trí đọc và mốc giờ riêng, tự lưu. Nhấp đúp để đổi tên, "Mở .txt"
  mở tab mới, đóng tab phải xác nhận. Chuyển tab thì tự dừng chạy; màn chiếu theo tab đang chọn.
- **Khung soạn thảo:** chế độ MD (gõ) và Preview (bản đọc đã định dạng).
- **Đồng hồ:** bắt đầu khi chữ thực sự chạy, vẫn chạy khi tạm dừng. Góc trên-phải xem trước và màn chiếu
  hiện thời gian còn lại (xanh) hoặc quá giờ (đỏ, `+mm:ss`). Bấm vào đồng hồ trên khung xem trước để
  đặt mốc giờ (`0` = chỉ hiện thời gian đã đọc) hoặc đặt lại. Không lưu khi tắt app; mốc giờ thì có lưu.
- **Cài đặt:** nút ⚙ cuối thanh tiêu đề khung Xem trước mở ngăn cài đặt hiển thị (có công tắc ẩn đồng hồ
  trên màn chiếu); tốc độ nằm cạnh nút CHẠY; nút ⚙ trên thanh đầu trang mở cài đặt ứng dụng
  (Sáng/Tối, đếm ngược, phím tắt, kiểm tra cập nhật).

## Phát triển

Cần Node.js LTS, Rust stable, Microsoft C++ Build Tools và WebView2 (có sẵn trên Windows 10/11).

| Lệnh | Tác dụng |
|---|---|
| `npm install` | Cài phụ thuộc |
| `npm run tauri dev` | Chạy ứng dụng ở chế độ phát triển |
| `npm run dev` | Chỉ chạy giao diện trong trình duyệt (`http://localhost:1420`) |
| `npm test` | Test frontend (Vitest) |
| `npm run lint` / `npm run format` | ESLint / Prettier |
| `cargo test`, `cargo clippy` (trong `src-tauri`) | Test và lint phần Rust |

Khi chạy trong trình duyệt, lưu trữ dùng localStorage và màn chiếu là một cửa sổ bật lên
(`#output`); các lệnh hệ thống (màn hình, hộp thoại file, cập nhật) chỉ có trong bản ứng dụng.

## Cấu trúc

- `src/engine`, `src/script` — lõi chạy chữ và phân tích kịch bản (không phụ thuộc React).
- `src/components`, `src/windows` — giao diện; `ControlWindow` là màn điều khiển, `OutputWindow` là màn chiếu.
- `src/bridge` — lớp nối với Tauri, có nhánh dự phòng cho trình duyệt.
- `src/state` — store Zustand, lưu trữ, trạng thái cập nhật.
- `src/lib` — hàm thuần: định dạng, màu, đồng hồ (`timer.ts`).
- `src-tauri/src` — lệnh Rust: màn hình (`monitors.rs`), cửa sổ chiếu (`output.rs`),
  file kịch bản (`script_io.rs`), cập nhật (`update.rs`), font hệ thống (`fonts.rs`).

## Đóng gói

```bash
npm run tauri build
```

Bộ cài NSIS nằm ở `src-tauri/target/release/bundle/nsis/`.

## Phát hành có tự cập nhật

Làm một lần:

1. Tạo cặp khóa ký: `npm run tauri signer generate -- -w ~/.tauri/prompter.key`.
   Giữ khóa riêng và mật khẩu ngoài kho mã.
2. Trong `src-tauri/tauri.conf.json`, mục `plugins.updater`: dán khóa công khai vào `pubkey`,
   thêm địa chỉ `latest.json` vào `endpoints` (phải là `https`).
3. Nếu dùng GitHub Actions: thêm secret `TAURI_SIGNING_PRIVATE_KEY` và
   `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` cho kho mã.

Mỗi lần phát hành:

1. Tăng `version` ở `package.json`, `src-tauri/tauri.conf.json` và `src-tauri/Cargo.toml`.
2. Đẩy thẻ `vX.Y.Z`. Workflow `release.yml` build bộ cài, ký gói cập nhật và tạo bản phát hành nháp
   kèm `latest.json`.
   Build tại máy thì đặt hai biến môi trường khóa ký rồi chạy
   `npm run tauri build -- --config src-tauri/tauri.release.conf.json`.
3. Muốn buộc người dùng cập nhật: thêm `"mandatory": true` vào `latest.json` trước khi công bố.

Ký số bộ cài (để Windows SmartScreen không cảnh báo) cần chứng thư ký mã riêng; cấu hình ở
`bundle.windows` trong `tauri.conf.json`.
