# Lộ trình xây dựng app máy nhắc chữ bằng Rust + Tauri 2 + React

Lộ trình này bám theo [BHN-Prompter-1.3.0-use-cases.md](BHN-Prompter-1.3.0-use-cases.md) (mã `UC-xx` bên dưới trỏ về file đó). Đăng nhập, xác thực và thu thập dữ liệu nằm ngoài phạm vi, giống file use case.

Thời lượng ghi ở mỗi giai đoạn là ước lượng cho một lập trình viên đã quen React và biết Rust cơ bản; tổng khoảng 4–5 tuần làm việc.

## 1. Quyết định kỹ thuật

| Hạng mục | Lựa chọn | Lý do |
|---|---|---|
| Vỏ ứng dụng | Tauri 2 (Rust), đích Windows x64 trước | Bộ cài nhỏ hơn Electron nhiều lần, dùng WebView2 có sẵn trên Windows 10/11 |
| Frontend | React 18 + TypeScript + Vite | Mẫu chính thức của `create-tauri-app` |
| Trạng thái UI | Zustand | Nhẹ, đọc được ngoài component (cần cho vòng lặp `requestAnimationFrame`) |
| Style | CSS Modules hoặc Tailwind | Giao diện chỉ có một màn, không cần thư viện component |
| Bộ chạy chữ | Module TypeScript thuần, không phụ thuộc React | Dùng chung cho cửa sổ điều khiển và cửa sổ chiếu, test được bằng Vitest |
| Hai cửa sổ | Một bundle React, hai `WebviewWindow` nhãn `main` và `output` | Chung mã dựng chữ nên xem trước khớp màn chiếu (UC-07) |
| Liên lạc hai cửa sổ | Sự kiện Tauri (`emitTo` / `listen`) | Thay cho `postMessage` + `window.opener` của bản gốc |
| Màn hình, cửa sổ chiếu | Lệnh Rust (`#[tauri::command]`) | Liệt kê màn hình, đặt cửa sổ toàn màn hình, theo dõi cắm/rút |
| Lưu cài đặt, kịch bản | `tauri-plugin-store` | File JSON trong thư mục dữ liệu ứng dụng, bền hơn localStorage |
| Mở/lưu `.txt` | `tauri-plugin-dialog` + đọc/ghi file trong Rust | Hộp thoại gốc của hệ điều hành; không phải cấp quyền file cho frontend |
| Một phiên bản | `tauri-plugin-single-instance` | UC-39 |
| Cập nhật | `tauri-plugin-updater` + `tauri-plugin-process` | Có sẵn kiểm tra chữ ký bản phát hành (UC-43) |
| Đóng gói | Bộ cài NSIS của Tauri bundler | Tương đương bộ cài gốc |

### Điểm khác so với bản Electron cần lưu ý

- **Tauri không có sự kiện cắm/rút màn hình.** Phải tự dò: một luồng Rust gọi `available_monitors()` mỗi 1–2 giây, so với lần trước, phát sự kiện `monitors-changed` khi khác (UC-34).
- **Màn hình không có id ổn định.** Tự tạo khóa từ tên + vị trí + kích thước; lưu khóa này làm "màn hình đã chọn" (UC-29).
- **Không có `window.open` trả về cửa sổ con.** Cửa sổ chiếu do Rust tạo; hai bên nói chuyện qua sự kiện và tự bắt tay bằng `hello` / `init`.
- **Chặn giảm tốc khi nằm nền:** bản gốc tắt `backgroundThrottling` cho cửa sổ chiếu. Với thiết kế bên dưới, cửa sổ chiếu luôn hiển thị trên màn phụ và là nguồn chuẩn về vị trí nên ít bị ảnh hưởng, nhưng cần kiểm chứng thực tế ở Giai đoạn 4 (thu nhỏ cửa sổ điều khiển trong lúc chạy).

## 2. Kiến trúc

```
┌──────────── Rust (src-tauri) ────────────┐
│ monitors.rs   liệt kê, dò thay đổi       │
│ output.rs     tạo/dời/đóng cửa sổ chiếu  │
│ script_io.rs  mở/lưu .txt                │
│ lib.rs        plugin, lệnh, vòng đời     │
└───────▲──────────────────────▲───────────┘
        │ invoke / event       │
┌───────┴────────┐  event  ┌───┴───────────┐
│ main (điều     │◄───────►│ output (màn   │
│ khiển, React)  │         │ chiếu, React) │
└────────────────┘         └───────────────┘
   dùng chung: engine/, script/, Stage
```

Nguyên tắc đồng bộ (giữ như bản gốc):

- Khi **đang chiếu**, cửa sổ chiếu là nguồn chuẩn về vị trí: nó tự chạy vòng lặp và báo `pos` 10 lần/giây; cửa sổ điều khiển chạy vòng lặp riêng để mượt và tự chỉnh theo `pos` nhận được.
- Khi **không chiếu**, cửa sổ điều khiển tự chạy một mình.
- Sau khi gửi lệnh, cửa sổ điều khiển bỏ qua `pos` trong 200 ms để không bị giật ngược.

### Cấu trúc thư mục

```
src/
  engine/        engine.ts (step, runCmd, start), speed.ts
  script/        parse.ts (## tiêu đề, [ghi chú], dòng trống, dòng HẾT)
  state/         settings.ts, script.ts, projection.ts (Zustand)
  bridge/        tauri.ts (invoke có kiểu), bus.ts (sự kiện giữa hai cửa sổ)
  components/    Stage, ScriptEditor, Preview, Transport, Progress,
                 SettingsPanel, ProjectionBar, AboutDialog, UpdateDialog
  windows/       ControlWindow.tsx, OutputWindow.tsx
  main.tsx       chọn cửa sổ theo nhãn (main | output)
src-tauri/
  src/           lib.rs, monitors.rs, output.rs, script_io.rs
  capabilities/  main.json, output.json
  tauri.conf.json
```

### Lệnh Rust

| Lệnh | Tác dụng | UC |
|---|---|---|
| `list_monitors()` | Trả `[{ key, index, name, width, height, x, y, primary }]`, kích thước theo điểm ảnh thật | UC-29 |
| `open_output(monitor_key)` | Tạo cửa sổ `output` không viền, toàn màn hình trên màn đích; đã mở thì dời sang màn đích | UC-30, UC-31 |
| `close_output()` | Đóng cửa sổ chiếu | UC-32 |
| `should_auto_project()` | `true` khi có từ 2 màn hình | UC-33 |
| `open_script()` | Hộp thoại chọn `.txt`, trả nội dung | UC-05 |
| `save_script(text)` | Hộp thoại lưu, tên mặc định `kich-ban.txt`, ghi UTF-8 | UC-06 |
| `app_info()` | Phiên bản ứng dụng, phiên bản Tauri/WebView | UC-41 |

### Sự kiện

| Sự kiện | Chiều | Nội dung |
|---|---|---|
| `monitors-changed` | Rust → main | Danh sách màn hình đổi |
| `output-closed` | Rust → main | Cửa sổ chiếu vừa đóng (kể cả do rút màn hình) |
| `out:hello` | output → main | Cửa sổ chiếu sẵn sàng |
| `ctl:init` | main → output | `{ settings, text, pos, playing }` |
| `ctl:settings` | main → output | Cài đặt mới |
| `ctl:script` | main → output | Kịch bản mới (trễ 250 ms) |
| `ctl:cmd` | main → output | `{ action: toggle|pause|reset|seek|lines|px, value }` |
| `out:pos` | output → main | `{ pos, playing, counting, w, h }`, mỗi 100 ms |
| `out:speed` | output → main | Tốc độ đổi tại màn chiếu |

## 3. Các giai đoạn

### Giai đoạn 0 — Khung dự án (0,5–1 ngày)

- Cài Rust (stable), Node LTS, Microsoft C++ Build Tools, WebView2.
- Tạo dự án:

```bash
npm create tauri-app@latest
```

- Chọn React + TypeScript; thêm ESLint, Prettier, Vitest; bật `cargo clippy` và `cargo fmt`.
- Đặt tên sản phẩm, `identifier`, biểu tượng (`npm run tauri icon`).
- **Xong khi:** `npm run tauri dev` mở được cửa sổ trống, `npm run tauri build` ra được bộ cài.

### Giai đoạn 1 — Lõi chạy chữ, chưa có Tauri (3–4 ngày)

Làm hoàn toàn trong trình duyệt bằng `npm run dev` để lặp nhanh.

- `script/parse.ts`: tách dòng, nhận tiêu đề `##`, ghi chú `[ ]`, dòng trống, thêm dòng kết thúc (UC-01, 02, 03). Trả về cấu trúc dữ liệu rồi để React dựng, không ghép chuỗi HTML.
- `engine/engine.ts`: trạng thái `{ pos, playing, counting }`, hàm `step(dt, max)`, `start(max)`, `runCmd(action, value, max)`; công thức tốc độ px/giây = tốc độ × cỡ chữ × 0,04 (UC-12 → 15, 17).
- Component `Stage`: nhận cài đặt + hệ số thu nhỏ, cuộn bằng `transform: translate3d` cập nhật qua `ref` trong `requestAnimationFrame` (không đưa `pos` vào state React), vạch đọc, lớp đếm ngược, lật gương (UC-13, 19 → 27).
- Test Vitest cho parser và engine: đếm ngược chỉ khi ở đầu, chạy lại từ đầu khi đang ở cuối, kẹp vị trí trong khoảng hợp lệ, dừng khi tới cuối.
- **Xong khi:** một trang thử chạy được kịch bản mẫu với đủ cài đặt hiển thị; toàn bộ test qua.

### Giai đoạn 2 — Màn điều khiển (4–5 ngày)

- Bố cục hai cột, một cột khi hẹp dưới 900 px (UC-40).
- `ScriptEditor`: ô soạn thảo, nút "Chạy từ con trỏ" và `Ctrl+Enter` (UC-16).
- `Preview`: `Stage` thu nhỏ theo tỉ lệ màn chiếu (mặc định 1920×1080), không lật gương; nhấp để nhảy dòng, lăn chuột để cuộn (UC-07, 08, 09).
- `Progress`: thanh tiến độ nhấp được, phần trăm, thời gian còn lại (UC-10, 11).
- `Transport`: về đầu, lùi/tới 3 dòng, chạy/dừng.
- `SettingsPanel`: thanh trượt, danh sách chọn, ô màu, ô đánh dấu với đúng khoảng giá trị và mặc định trong file use case (UC-17, 19 → 27).
- Phím tắt toàn cục của cửa sổ, bỏ qua khi tiêu điểm ở ô nhập, chỉ `Esc` khi có hộp thoại (UC-18).
- **Xong khi:** dùng trọn vẹn trong một cửa sổ, chưa cần màn chiếu.

### Giai đoạn 3 — Lưu trữ và file (1,5–2 ngày)

- `tauri-plugin-store`: lưu cài đặt ngay khi đổi, lưu kịch bản có trễ ngắn; nạp lúc khởi động, trộn với giá trị mặc định; lần đầu dùng kịch bản mẫu (UC-04, 28).
- Lệnh `open_script` / `save_script` (UC-05, 06). Mở file xong thì về đầu và dừng chạy.
- Khai báo quyền trong `capabilities/main.json`.
- **Xong khi:** tắt mở lại vẫn còn kịch bản và cài đặt; mở/lưu `.txt` tiếng Việt không lỗi dấu.

### Giai đoạn 4 — Màn chiếu và đa màn hình (5–6 ngày)

Đây là phần rủi ro nhất; cần ít nhất hai màn hình thật để thử.

- `monitors.rs`: `list_monitors`, tạo khóa màn hình, xác định màn chính.
- `output.rs`: tạo `WebviewWindow` nhãn `output`, không viền, nền đen; đặt vị trí và kích thước theo điểm ảnh thật của màn đích rồi bật toàn màn hình; luôn nằm trên cùng khi màn đích không phải màn chính (UC-30).
- Dời cửa sổ khi đổi màn đích (UC-31); đóng cửa sổ (UC-32); phát `output-closed` khi cửa sổ bị hủy.
- `OutputWindow.tsx`: `Stage` toàn màn, bắt tay `out:hello` → `ctl:init`, nhận lệnh, báo `out:pos`; phím tắt, lăn chuột, `Esc` để tắt chiếu; gợi ý tự mờ; ẩn con trỏ sau 2 giây (UC-36, 37, 38).
- `ProjectionBar`: danh sách màn hình, nút quét lại, nút Chiếu / Chuyển màn / Tắt chiếu, nhãn trạng thái ba mức dựa trên thời điểm nhận `out:pos` gần nhất (UC-29, 35).
- Tự chiếu khi khởi động nếu có từ 2 màn hình (UC-33).
- Luồng dò màn hình: phát `monitors-changed`; nếu màn đang chiếu biến mất thì đóng cửa sổ chiếu (UC-34).
- Đóng cửa sổ điều khiển thì thoát ứng dụng, kéo theo cửa sổ chiếu (UC-40).
- `capabilities/output.json`: chỉ cấp quyền sự kiện, không cấp quyền file hay store.
- **Cần kiểm chứng trong giai đoạn này:**
  - Toàn màn hình đúng trên màn phụ có hệ số phóng to khác màn chính (100% / 125% / 150%).
  - Chữ không khựng khi thu nhỏ hoặc che cửa sổ điều khiển lúc đang chạy.
  - Rút cáp màn phụ khi đang chiếu.
- **Xong khi:** chạy được một buổi nhắc chữ đầy đủ trên hai màn hình, điều khiển được từ cả hai phía.

### Giai đoạn 5 — Hoàn thiện ứng dụng (1,5–2 ngày)

- `tauri-plugin-single-instance`: mở lần hai thì đưa cửa sổ đang chạy lên trước (UC-39).
- Cửa sổ điều khiển mở phóng to, kích thước tối thiểu 980×620, không thanh menu (UC-40).
- Chân trang và hộp thoại Giới thiệu, lấy phiên bản từ `app_info` (UC-41).
- Rà soát `tauri.conf.json`: CSP chặt, chỉ bật các quyền thật sự dùng.

### Giai đoạn 6 — Cập nhật phần mềm (2–3 ngày)

- Tạo cặp khóa ký cập nhật (`npm run tauri signer generate`), cất khóa riêng ngoài kho mã.
- Cấu hình `tauri-plugin-updater` với địa chỉ file mô tả bản phát hành trên máy chủ của bạn.
- Kiểm tra lúc khởi động và 6 giờ một lần; nút kiểm tra thủ công; nhãn "Có bản mới" ở chân trang (UC-42).
- Hộp thoại cập nhật: ghi chú phát hành, tiến độ tải, cài rồi khởi động lại; thông báo sau khi cập nhật xong (UC-43).
- Cập nhật bắt buộc: thêm trường riêng (ví dụ `mandatory`) vào file mô tả bản phát hành, hộp thoại tự mở và không có nút "Để sau" (UC-44). Cần xác nhận cách đọc trường tùy biến từ plugin updater khi làm.
- **Xong khi:** cài bản N, phát hành bản N+1 lên máy chủ thử, ứng dụng tự cập nhật thành công.

### Giai đoạn 7 — Đóng gói và phát hành (2–3 ngày)

- Bộ cài NSIS: tiếng Việt, cài cho người dùng hiện tại, kèm trình tải WebView2.
- Ký số bộ cài (chứng thư ký mã) để tránh cảnh báo SmartScreen.
- GitHub Actions (hoặc CI khác) với `tauri-action`: build, ký, tạo file mô tả cập nhật.
- Thử trên máy sạch Windows 10 và 11.

## 4. Kiểm thử

| Loại | Công cụ | Phạm vi |
|---|---|---|
| Đơn vị (TS) | Vitest | Parser kịch bản, engine, tính thời gian còn lại, chọn màn hình mặc định |
| Đơn vị (Rust) | `cargo test` | Tạo khóa màn hình, so sánh danh sách màn hình |
| Component | React Testing Library | Phím tắt, bảng cài đặt, trạng thái nút Chiếu |
| Thủ công | Bảng kiểm theo 44 UC | Đa màn hình, cắm/rút, lật gương, hệ số phóng to khác nhau |
| Đầu-cuối (tùy chọn) | WebdriverIO + `tauri-driver` | Luồng chính: dán kịch bản → chiếu → chạy → tắt chiếu |

Mỗi tiêu chí chấp nhận trong file use case nên thành một dòng trong bảng kiểm thủ công.

## 5. Rủi ro

| Rủi ro | Mức | Cách xử lý |
|---|---|---|
| Toàn màn hình sai vị trí/kích thước trên màn hình có hệ số phóng to khác nhau | Cao | Luôn dùng tọa độ điểm ảnh thật; thử sớm ở đầu Giai đoạn 4 |
| Không có sự kiện cắm/rút màn hình | Trung bình | Dò định kỳ trong Rust; chấp nhận trễ 1–2 giây |
| Chữ cuộn không mượt trên WebView2 với cỡ chữ lớn | Trung bình | Chỉ đổi `transform`, không đổi layout mỗi khung hình; đo bằng DevTools |
| Xem trước xuống dòng khác màn chiếu | Trung bình | Thu nhỏ cỡ chữ theo đúng tỉ lệ bề rộng, cùng font và cùng lề phần trăm |
| WebView2 thiếu trên máy cũ | Thấp | Bộ cài kèm trình tải WebView2 |

## 6. Mốc bàn giao

| Mốc | Sau giai đoạn | Kết quả |
|---|---|---|
| M1 — Bản chạy một màn hình | 0 → 3 | Soạn, chỉnh, chạy chữ, lưu/mở file trong một cửa sổ |
| M2 — Bản chiếu hai màn hình | 4 | Đủ chức năng nhắc chữ thực tế, dùng thử nội bộ được |
| M3 — Bản phát hành | 5 → 7 | Bộ cài đã ký, tự cập nhật |

## 7. Ý tưởng sau bản đầu

Các mục này không có trong bản gốc 1.3.0, chỉ nên làm sau M3: quản lý nhiều kịch bản, nhập `.docx`, điều khiển từ điện thoại qua mạng nội bộ, hỗ trợ bàn đạp/remote, đồng hồ bấm giờ trên màn chiếu, bộ thiết lập sẵn, tự nhận biết bảng mã khi mở file.
