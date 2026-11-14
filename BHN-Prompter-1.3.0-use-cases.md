# BHN Prompter 1.3.0 — Use case & User story

Tài liệu bóc tách tính năng từ bộ cài `BHN-Prompter-Setup-1.3.0.exe` (phần mềm máy nhắc chữ của BHN Media).

## 0. Nguồn và phạm vi

| Mục | Nội dung |
|---|---|
| File phân tích | `BHN-Prompter-Setup-1.3.0.exe` (SHA-256 `0800ed3e…9cc7fc`), bộ cài NSIS của electron-builder |
| Ứng dụng bên trong | Electron, `resources/app.asar` (SHA-256 `b9b49a96…3a8053`), gồm `main.js`, `preload.js`, `index.html`, thư mục `bhn-account/` |
| Phương pháp | Phân tích tĩnh: giải nén installer → bóc `app.asar` → đọc mã nguồn (không bị làm rối). **Chưa chạy ứng dụng**, nên mọi mô tả là hành vi đọc từ mã, chưa quan sát lúc chạy |
| Bỏ qua theo yêu cầu | Đăng nhập, phiên đăng nhập, xác thực, heartbeat, thông tin thiết bị gửi về máy chủ (toàn bộ module `bhn-account/` phần tài khoản) |
| Đọc lướt | Nhóm cập nhật phần mềm (mục 9) nằm trong `bhn-account/`; chỉ đọc phần logic tải/kiểm tra/cài, chưa đọc chi tiết giao diện hộp thoại cập nhật |

Lưu ý phụ thuộc: bản cài đặt chỉ mở màn điều khiển sau khi đăng nhập thành công; khi phiên kết thúc thì chữ đang chạy bị dừng và màn chiếu tự tắt. Phần này thuộc nhóm bị loại nên không viết thành use case.

### Tác nhân

| Tác nhân | Vai trò |
|---|---|
| **Người vận hành** | Kỹ thuật viên/đạo diễn ngồi ở màn điều khiển: soạn kịch bản, chỉnh hiển thị, điều khiển chạy chữ |
| **MC** | Người đọc chữ trên màn chiếu (màn hình máy nhắc chữ); có thể tự điều khiển bằng bàn phím/chuột gắn với màn chiếu |
| **Hệ thống** | Ứng dụng tự phản ứng với sự kiện (cắm/rút màn hình, khởi động, đồng bộ hai cửa sổ) |

### Kiến trúc tính năng (tóm tắt)

- **Cửa sổ điều khiển**: soạn kịch bản, xem trước, điều khiển, cài đặt.
- **Cửa sổ chiếu** (cùng `index.html` với `#output`): không viền, toàn màn hình trên màn hình đích, chỉ hiển thị chữ.
- Hai cửa sổ trao đổi qua `postMessage`: điều khiển gửi kịch bản/cài đặt/lệnh; màn chiếu báo vị trí 10 lần/giây và là nguồn chuẩn về vị trí khi đang chiếu.

### Danh mục use case

| Nhóm | Mã | Tên |
|---|---|---|
| 1. Kịch bản | UC-01 | Soạn/dán kịch bản |
| | UC-02 | Đánh dấu tiêu đề đoạn bằng `##` |
| | UC-03 | Ghi chú dàn dựng bằng `[ngoặc vuông]` |
| | UC-04 | Tự lưu kịch bản và kịch bản mẫu |
| | UC-05 | Mở kịch bản từ file .txt |
| | UC-06 | Lưu kịch bản ra file .txt |
| 2. Xem trước | UC-07 | Xem trước giống màn chiếu |
| | UC-08 | Nhấp vào dòng để đưa lên vạch đọc |
| | UC-09 | Cuộn tay bằng con lăn chuột |
| | UC-10 | Theo dõi tiến độ và thời gian còn lại |
| | UC-11 | Nhảy vị trí bằng thanh tiến độ |
| 3. Điều khiển chạy chữ | UC-12 | Chạy / tạm dừng |
| | UC-13 | Đếm ngược trước khi chạy |
| | UC-14 | Về đầu kịch bản |
| | UC-15 | Lùi/tới theo dòng |
| | UC-16 | Chạy từ vị trí con trỏ soạn thảo |
| | UC-17 | Điều chỉnh tốc độ chạy |
| | UC-18 | Điều khiển bằng phím tắt |
| 4. Hiển thị chữ | UC-19 | Cỡ chữ |
| | UC-20 | Giãn dòng |
| | UC-21 | Lề hai bên |
| | UC-22 | Font chữ |
| | UC-23 | Căn chữ |
| | UC-24 | Chữ in hoa |
| | UC-25 | Màu chữ, nền, ghi chú, tiêu đề |
| | UC-26 | Vạch đọc |
| | UC-27 | Lật gương ngang / lật dọc |
| | UC-28 | Tự lưu cài đặt |
| 5. Chiếu ra màn hình | UC-29 | Liệt kê và chọn màn hình đích |
| | UC-30 | Bật chiếu toàn màn hình |
| | UC-31 | Chuyển màn chiếu sang màn hình khác |
| | UC-32 | Tắt chiếu |
| | UC-33 | Tự chiếu khi khởi động |
| | UC-34 | Phản ứng khi cắm/rút màn hình |
| | UC-35 | Trạng thái chiếu |
| 6. Màn chiếu | UC-36 | Điều khiển ngay trên màn chiếu |
| | UC-37 | Đồng bộ trực tiếp kịch bản và cài đặt |
| | UC-38 | Gợi ý thao tác và tự ẩn con trỏ |
| 7. Cửa sổ ứng dụng | UC-39 | Chỉ chạy một phiên bản ứng dụng |
| | UC-40 | Hành vi cửa sổ điều khiển |
| 8. Thông tin | UC-41 | Xem giới thiệu và phiên bản |
| 9. Cập nhật | UC-42 | Kiểm tra bản mới |
| | UC-43 | Tải và cài bản cập nhật |
| | UC-44 | Cập nhật bắt buộc |

---

## 1. Kịch bản

### UC-01 — Soạn/dán kịch bản

**User story:** Là người vận hành, tôi muốn gõ hoặc dán kịch bản vào ô soạn thảo để nội dung hiện ngay ở phần xem trước và trên màn chiếu.

- **Tiền điều kiện:** Màn điều khiển đang mở.
- **Luồng chính:**
  1. Người vận hành gõ/dán văn bản vào ô "Kịch bản" (gợi ý: "Dán kịch bản vào đây...").
  2. Hệ thống dựng lại phần xem trước sau mỗi lần gõ.
  3. Hệ thống gửi kịch bản mới sang màn chiếu sau 250 ms không gõ tiếp.
- **Tiêu chí chấp nhận:**
  - Mỗi dòng trong ô soạn thảo là một dòng hiển thị; dòng dài tự xuống dòng theo bề rộng màn.
  - Dòng trống hiển thị thành khoảng trống một dòng.
  - Cuối kịch bản luôn có dòng kết thúc "■ HẾT ■" (chữ nhỏ, xám, căn giữa).
  - Ký tự đặc biệt HTML (`& < > "`) hiển thị nguyên văn.
  - Ô soạn thảo tắt kiểm tra chính tả.
  - Sửa kịch bản khi đang chạy không làm dừng chạy.

### UC-02 — Đánh dấu tiêu đề đoạn bằng `##`

**User story:** Là người vận hành, tôi muốn đánh dấu tên phần/mục của chương trình để MC nhận ra điểm chuyển đoạn.

- **Luồng chính:** Bắt đầu một dòng bằng `##` (ví dụ `## CHÀO MỪNG`).
- **Tiêu chí chấp nhận:**
  - Dòng hiển thị đậm hơn, màu tiêu đề (mặc định xanh `#4fc3ff`), không hiện ký tự `#`.
  - Khoảng trắng đầu dòng trước `##` được bỏ qua; nhiều dấu `#` liên tiếp đều bị lược.
  - Ghi chú `[ ]` trong dòng tiêu đề không được tô màu ghi chú.

### UC-03 — Ghi chú dàn dựng bằng `[ngoặc vuông]`

**User story:** Là người vận hành, tôi muốn chèn chỉ dẫn sân khấu (nhạc, dừng, di chuyển) mà MC nhìn thấy nhưng không đọc thành lời.

- **Luồng chính:** Đặt chỉ dẫn trong `[ ... ]` ở bất kỳ đâu trong dòng thường.
- **Tiêu chí chấp nhận:**
  - Phần trong ngoặc (kể cả dấu ngoặc) hiển thị nghiêng, nét mảnh hơn, màu ghi chú (mặc định vàng `#ffd400`).
  - Một dòng có thể có nhiều ghi chú; phần chữ còn lại giữ màu chữ thường.

### UC-04 — Tự lưu kịch bản và kịch bản mẫu

**User story:** Là người vận hành, tôi muốn kịch bản được giữ lại giữa các lần mở phần mềm để không phải dán lại.

- **Tiêu chí chấp nhận:**
  - Mỗi lần gõ, kịch bản được lưu cục bộ trên máy (localStorage, khóa `bhnp_script_v1`); không cần nút lưu.
  - Mở lại phần mềm thấy đúng kịch bản lần trước.
  - Lần chạy đầu tiên (chưa có gì được lưu) hiện kịch bản mẫu kèm hướng dẫn nhanh về `##`, `[ ]` và phím tắt.
  - Chỉ lưu một kịch bản; không có danh sách/quản lý nhiều kịch bản.

### UC-05 — Mở kịch bản từ file .txt

**User story:** Là người vận hành, tôi muốn nạp kịch bản từ file văn bản do biên tập viên gửi.

- **Luồng chính:**
  1. Bấm "📂 Mở .txt" và chọn file `.txt`.
  2. Hệ thống đọc file theo UTF-8, thay toàn bộ nội dung ô soạn thảo.
  3. Hệ thống đưa vị trí chạy về đầu và dừng chạy.
- **Tiêu chí chấp nhận:**
  - Nội dung mới được tự lưu và đồng bộ sang màn chiếu như khi gõ tay.
  - Chọn lại đúng file vừa mở vẫn nạp lại được.
  - Không hỏi xác nhận trước khi ghi đè kịch bản đang có.
- **Giới hạn:** chỉ nhận `.txt`; không hỗ trợ Word/PDF; không tự nhận biết bảng mã khác UTF-8.

### UC-06 — Lưu kịch bản ra file .txt

**User story:** Là người vận hành, tôi muốn xuất kịch bản đang soạn ra file để lưu trữ hoặc chuyển sang máy khác.

- **Luồng chính:** Bấm "💾 Lưu .txt" → hệ thống tạo file tải về.
- **Tiêu chí chấp nhận:**
  - Tên file mặc định `kich-ban.txt`, mã hóa UTF-8, nội dung đúng như trong ô soạn thảo (giữ nguyên `##` và `[ ]`).

---

## 2. Xem trước và tiến độ

### UC-07 — Xem trước giống màn chiếu

**User story:** Là người vận hành, tôi muốn thấy đúng những gì MC đang thấy mà không phải nhìn sang màn chiếu.

- **Tiêu chí chấp nhận:**
  - Khung xem trước giữ đúng tỉ lệ khung hình của màn chiếu thật (mặc định 1920×1080; tự cập nhật theo kích thước màn chiếu báo về).
  - Chữ, lề, màu, vạch đọc, vị trí cuộn được thu nhỏ theo tỉ lệ nên chỗ xuống dòng khớp với màn chiếu.
  - Xem trước **không** áp dụng lật gương, để người vận hành luôn đọc được.
  - Khung tự co giãn theo kích thước cửa sổ (cao tối đa khoảng 42% chiều cao cửa sổ).
  - Số đếm ngược cũng hiện trong khung xem trước.

### UC-08 — Nhấp vào dòng để đưa lên vạch đọc

**User story:** Là người vận hành, tôi muốn nhấp vào một dòng trong xem trước để nhảy ngay tới đó khi MC đọc lệch hoặc bỏ đoạn.

- **Tiêu chí chấp nhận:**
  - Điểm được nhấp dịch về đúng vị trí vạch đọc, trên cả xem trước và màn chiếu.
  - Trạng thái chạy/dừng không đổi.
  - Vị trí không vượt quá đầu hoặc cuối kịch bản.

### UC-09 — Cuộn tay bằng con lăn chuột

**User story:** Là người vận hành, tôi muốn lăn chuột trên khung xem trước để tinh chỉnh vị trí chữ theo nhịp đọc của MC.

- **Tiêu chí chấp nhận:**
  - Lăn xuống → chữ tiến; lăn lên → chữ lùi; màn chiếu dịch theo.
  - Dùng được cả khi đang chạy lẫn đang dừng.

### UC-10 — Theo dõi tiến độ và thời gian còn lại

**User story:** Là người vận hành, tôi muốn biết đã đọc được bao nhiêu và còn bao lâu để canh thời lượng chương trình.

- **Tiêu chí chấp nhận:**
  - Thanh tiến độ và số phần trăm cập nhật liên tục theo vị trí hiện tại.
  - "Còn lại: mm:ss" tính theo quãng còn lại chia cho tốc độ hiện tại; đổi tốc độ hoặc cỡ chữ thì con số tính lại.
  - Tốc độ bằng 0 → hiện "Còn lại: --:--".

### UC-11 — Nhảy vị trí bằng thanh tiến độ

**User story:** Là người vận hành, tôi muốn nhấp lên thanh tiến độ để nhảy nhanh tới một phần bất kỳ của kịch bản dài.

- **Tiêu chí chấp nhận:** Nhấp ở x% bề ngang thanh → vị trí chuyển tới x% kịch bản, đồng bộ sang màn chiếu.

---

## 3. Điều khiển chạy chữ

### UC-12 — Chạy / tạm dừng

**User story:** Là người vận hành, tôi muốn bật và tạm dừng chữ chạy bằng một nút hoặc một phím để bám theo MC.

- **Luồng chính:** Bấm nút "▶ CHẠY" hoặc phím `Space`.
- **Tiêu chí chấp nhận:**
  - Khi đang chạy (hoặc đang đếm ngược) nút đổi thành "⏸ DỪNG" và đổi kiểu hiển thị.
  - Dừng trong lúc đếm ngược sẽ hủy đếm ngược.
  - Chữ cuộn đều, mượt; tới dòng cuối thì tự dừng.
  - Bấm chạy khi đang ở cuối kịch bản → quay về đầu rồi chạy lại.

### UC-13 — Đếm ngược trước khi chạy

**User story:** Là MC, tôi muốn có vài giây đếm ngược trước khi chữ bắt đầu chạy để kịp chuẩn bị.

- **Tùy chọn:** Tắt / 3 giây / 5 giây (mặc định 3 giây).
- **Tiêu chí chấp nhận:**
  - Chỉ đếm ngược khi bắt đầu từ đầu kịch bản; tiếp tục giữa chừng thì chạy ngay.
  - Số đếm hiện lớn giữa màn (khoảng 45% chiều cao), nền mờ tối, trên cả màn chiếu và xem trước.
  - Hết đếm ngược chữ tự chạy.

### UC-14 — Về đầu kịch bản

**User story:** Là người vận hành, tôi muốn đưa chữ về đầu để chuẩn bị cho lượt đọc mới.

- **Luồng chính:** Bấm "⏮" hoặc phím `Home`.
- **Tiêu chí chấp nhận:** Vị trí về 0, đồng thời dừng chạy và hủy đếm ngược.

### UC-15 — Lùi/tới theo dòng

**User story:** Là người vận hành, tôi muốn dịch chữ lùi hoặc tới vài dòng khi MC đọc lại hoặc nói vượt.

- **Tiêu chí chấp nhận:**
  - Nút "⏪" / "⏩" hoặc `PageUp` / `PageDown`: lùi/tới 3 dòng.
  - Phím `←` / `→`: lùi/tới 1 dòng.
  - Một "dòng" bằng cỡ chữ × giãn dòng hiện tại.
  - Không làm thay đổi trạng thái chạy/dừng.

### UC-16 — Chạy từ vị trí con trỏ soạn thảo

**User story:** Là người vận hành, tôi muốn đặt con trỏ ở một dòng trong ô soạn thảo rồi đưa đúng dòng đó lên vạch đọc, để bắt đầu từ giữa kịch bản.

- **Luồng chính:** Đặt con trỏ trong ô soạn thảo → bấm "⤴ Chạy từ con trỏ" hoặc `Ctrl+Enter`.
- **Tiêu chí chấp nhận:**
  - Dòng chứa con trỏ nằm ở vạch đọc trên xem trước và màn chiếu.
  - Trạng thái chạy/dừng không đổi (nút chỉ định vị, không tự bấm chạy).
  - `Ctrl+Enter` không chèn xuống dòng vào kịch bản.

### UC-17 — Điều chỉnh tốc độ chạy

**User story:** Là người vận hành, tôi muốn tăng giảm tốc độ cuộn ngay trong lúc chạy để khớp tốc độ đọc của MC.

- **Cách điều chỉnh:** thanh trượt; nút "−" / "+" (±1); phím `↑` / `↓` (±1, giữ `Shift` ±5).
- **Tiêu chí chấp nhận:**
  - Khoảng 0–60, bước 0,5, mặc định 10; số hiện với một chữ số thập phân.
  - Tốc độ thực tế tỉ lệ với cỡ chữ (px/giây = tốc độ × cỡ chữ × 0,04), nên đổi cỡ chữ vẫn giữ nhịp đọc số dòng/giây tương đương.
  - Tốc độ 0 → chữ đứng yên dù đang ở trạng thái chạy.
  - Thay đổi có hiệu lực ngay trên màn chiếu, không giật vị trí.

### UC-18 — Điều khiển bằng phím tắt

**User story:** Là người vận hành, tôi muốn điều khiển toàn bộ bằng bàn phím để không phải rời mắt tìm nút.

| Phím | Tác dụng |
|---|---|
| `Space` | Chạy / dừng |
| `↑` / `↓` | Tăng / giảm tốc độ 1 (`Shift`: 5) |
| `←` / `→` | Lùi / tới 1 dòng |
| `PageUp` / `PageDown` | Lùi / tới 3 dòng |
| `Home` | Về đầu |
| `+` / `−` | Tăng / giảm cỡ chữ 4 px (chỉ ở màn điều khiển) |
| `Ctrl+Enter` | Chạy từ con trỏ (khi đang ở ô soạn thảo) |
| `Esc` | Đóng hộp thoại đang mở (màn điều khiển) / tắt chiếu (màn chiếu) |

- **Tiêu chí chấp nhận:**
  - Phím tắt không kích hoạt khi tiêu điểm đang ở ô soạn thảo, ô nhập hoặc danh sách chọn (để gõ kịch bản bình thường).
  - Khi có hộp thoại đang mở, chỉ `Esc` có tác dụng.
  - Bảng phím tắt được in sẵn ở cuối khung điều khiển.

---

## 4. Tùy chỉnh hiển thị chữ

Mọi thay đổi trong nhóm này áp dụng tức thì cho cả xem trước và màn chiếu.

### UC-19 — Cỡ chữ

**User story:** Là người vận hành, tôi muốn chỉnh cỡ chữ theo khoảng cách từ MC tới máy nhắc chữ.

- **Tiêu chí chấp nhận:** 24–260 px (tính theo điểm ảnh màn chiếu), bước 2, mặc định 80; phím `+`/`−` đổi 4 px mỗi lần.

### UC-20 — Giãn dòng

**User story:** Là người vận hành, tôi muốn chỉnh khoảng cách dòng để chữ dễ dò hơn.

- **Tiêu chí chấp nhận:** 1,00–2,20, bước 0,05, mặc định 1,35; chiều cao vạch đọc đổi theo.

### UC-21 — Lề hai bên

**User story:** Là người vận hành, tôi muốn thu hẹp cột chữ để mắt MC ít phải đảo ngang.

- **Tiêu chí chấp nhận:** 0–35% bề rộng mỗi bên, bước 1, mặc định 8%.

### UC-22 — Font chữ

**User story:** Là người vận hành, tôi muốn chọn font dễ đọc với MC.

- **Tiêu chí chấp nhận:** Chọn một trong Arial (mặc định), Segoe UI, Roboto, Tahoma, Verdana, Times New Roman; font không có trên máy thì rơi về Arial.

### UC-23 — Căn chữ

**User story:** Là người vận hành, tôi muốn chọn căn trái hoặc căn giữa theo thói quen đọc của MC.

- **Tiêu chí chấp nhận:** Hai lựa chọn Trái (mặc định) / Giữa.

### UC-24 — Chữ in hoa

**User story:** Là người vận hành, tôi muốn hiển thị toàn bộ chữ in hoa mà không phải sửa kịch bản gốc.

- **Tiêu chí chấp nhận:** Bật "CHỮ IN HOA" chỉ đổi cách hiển thị; nội dung ô soạn thảo và file lưu ra giữ nguyên.

### UC-25 — Màu chữ, nền, ghi chú, tiêu đề

**User story:** Là người vận hành, tôi muốn đổi màu để hợp điều kiện ánh sáng trường quay và phân biệt rõ phần MC đọc với phần chỉ dẫn.

- **Tiêu chí chấp nhận:** Bốn ô chọn màu độc lập — chữ (`#ffffff`), nền (`#000000`), ghi chú `[ ]` (`#ffd400`), tiêu đề `##` (`#4fc3ff`).

### UC-26 — Vạch đọc

**User story:** Là MC, tôi muốn có một dải đánh dấu cố định để biết dòng đang phải đọc.

- **Tiêu chí chấp nhận:**
  - Bật/tắt bằng "Hiện vạch đọc" (mặc định bật).
  - Vạch là dải mờ cao bằng một dòng, có mũi tên cam hai bên.
  - Vị trí vạch chỉnh từ 10% đến 70% chiều cao màn (mặc định 30%).
  - Vị trí vạch cũng là mốc căn dòng: các thao tác nhảy dòng, chạy từ con trỏ đều đưa dòng về vị trí này, kể cả khi vạch đang ẩn.

### UC-27 — Lật gương ngang / lật dọc

**User story:** Là người vận hành, tôi muốn lật hình trên màn chiếu để chữ đọc xuôi qua kính phản chiếu của máy nhắc chữ.

- **Tiêu chí chấp nhận:**
  - "Lật gương ngang" và "Lật dọc" bật độc lập, có thể bật cả hai.
  - Chỉ màn chiếu bị lật; xem trước luôn hiển thị xuôi.
  - Khi bật lật dọc, chiều lăn chuột trên màn chiếu được đảo cho khớp chiều nhìn.

### UC-28 — Tự lưu cài đặt

**User story:** Là người vận hành, tôi muốn các thiết lập hiển thị được nhớ cho lần sau.

- **Tiêu chí chấp nhận:**
  - Mọi thay đổi (kể cả tốc độ) lưu ngay trên máy (localStorage, khóa `bhnp_settings_v1`).
  - Thiết lập mới thêm ở phiên bản sau nhận giá trị mặc định nếu bản lưu cũ chưa có.
  - Không có nút "khôi phục mặc định" và không có bộ thiết lập sẵn (preset).

---

## 5. Chiếu ra màn hình máy nhắc chữ

### UC-29 — Liệt kê và chọn màn hình đích

**User story:** Là người vận hành, tôi muốn chọn chính xác màn hình nào là máy nhắc chữ khi máy tính nối nhiều màn hình.

- **Tiêu chí chấp nhận:**
  - Danh sách "Chiếu ra" hiện mỗi màn hình theo dạng `Màn hình N – rộng×cao (chính|phụ) · tên`; độ phân giải là điểm ảnh thật (đã nhân hệ số phóng to).
  - Mặc định chọn: màn hình đã chọn lần trước → nếu không còn thì màn phụ đầu tiên → nếu không có thì màn chính.
  - Lựa chọn được ghi nhớ (khóa `bhnp_display_v1`).
  - Nút "⟳" quét lại danh sách màn hình.

### UC-30 — Bật chiếu toàn màn hình

**User story:** Là người vận hành, tôi muốn bấm một nút để chữ hiện toàn màn hình trên máy nhắc chữ.

- **Luồng chính:**
  1. Chọn màn hình đích, bấm "▶ Chiếu".
  2. Hệ thống mở cửa sổ "BHN Prompter – Màn chiếu" không viền, phủ kín màn hình đích, ở chế độ toàn màn hình.
  3. Màn chiếu nhận kịch bản, cài đặt, vị trí và trạng thái chạy hiện tại từ màn điều khiển.
- **Tiêu chí chấp nhận:**
  - Nếu màn đích không phải màn chính, cửa sổ chiếu luôn nằm trên cùng (mức ưu tiên cao như trình bảo vệ màn hình).
  - Bật chiếu khi đang chạy → màn chiếu chạy tiếp từ đúng vị trí đó.
  - Màn chiếu không bị giảm tốc khi nằm nền (không giật khi người vận hành thao tác cửa sổ khác).
  - Chỉ có tối đa một cửa sổ chiếu.
  - Nếu màn hình đã chọn không còn, hệ thống chiếu lên một màn phụ bất kỳ, không có thì màn chính.

### UC-31 — Chuyển màn chiếu sang màn hình khác

**User story:** Là người vận hành, tôi muốn đổi màn chiếu sang màn hình khác mà không phải tắt rồi bật lại.

- **Tiêu chí chấp nhận:**
  - Khi đang chiếu, nút "▶ Chiếu" đổi thành "⇄ Chuyển màn".
  - Đổi lựa chọn trong danh sách hoặc bấm "⇄ Chuyển màn" → cửa sổ chiếu dời sang màn hình mới và toàn màn hình lại.
  - Vị trí và trạng thái chạy được giữ nguyên.

### UC-32 — Tắt chiếu

**User story:** Là người vận hành, tôi muốn tắt màn chiếu khi xong chương trình hoặc cần trả lại màn hình.

- **Tiêu chí chấp nhận:**
  - Nút "■ Tắt chiếu" (viền đỏ) chỉ hiện khi đang có màn chiếu; bấm sẽ đóng cửa sổ chiếu.
  - Nhấn `Esc` trên màn chiếu cũng tắt chiếu.
  - Tắt chiếu không làm mất vị trí; màn điều khiển và xem trước vẫn điều khiển được, bật chiếu lại sẽ tiếp tục từ vị trí hiện tại.

### UC-33 — Tự chiếu khi khởi động

**User story:** Là người vận hành, tôi muốn phần mềm tự chiếu ra màn phụ ngay khi mở, để rút ngắn bước chuẩn bị.

- **Tiêu chí chấp nhận:**
  - Khi mở màn điều khiển, nếu máy có từ 2 màn hình trở lên, hệ thống tự bật chiếu lên màn hình đang được chọn theo quy tắc UC-29.
  - Chỉ có một màn hình → không tự chiếu.
  - Không có tùy chọn tắt hành vi này.

### UC-34 — Phản ứng khi cắm/rút màn hình

**User story:** Là người vận hành, tôi muốn phần mềm tự nhận biết khi màn hình được cắm, rút hoặc đổi độ phân giải, để không phải khởi động lại.

- **Tiêu chí chấp nhận:**
  - Cắm thêm, rút bớt hoặc đổi thông số màn hình → danh sách "Chiếu ra" tự làm mới.
  - Rút đúng màn hình đang chiếu → cửa sổ chiếu tự đóng (không nhảy đè lên màn điều khiển).
  - Cắm màn hình mới không tự bật chiếu; người vận hành bấm "▶ Chiếu".

### UC-35 — Trạng thái chiếu

**User story:** Là người vận hành, tôi muốn nhìn là biết màn chiếu có đang hoạt động không.

- **Tiêu chí chấp nhận:** Nhãn trạng thái ở đầu màn điều khiển có ba mức:
  - "● Chưa chiếu" — không có cửa sổ chiếu.
  - "● Đang mở màn chiếu…" — cửa sổ đã mở nhưng chưa có tín hiệu trong 2 giây gần nhất.
  - "● Đang chiếu (rộng×cao)" — màu xanh, kèm kích thước thực của màn chiếu.

---

## 6. Màn chiếu

### UC-36 — Điều khiển ngay trên màn chiếu

**User story:** Là MC tự vận hành, tôi muốn điều khiển chữ bằng bàn phím/chuột ngay tại màn chiếu mà không cần người hỗ trợ.

- **Tiêu chí chấp nhận:**
  - Dùng được `Space`, `↑`/`↓` (`Shift` ×5), `←`/`→`, `PageUp`/`PageDown`, `Home`, `Esc` với ý nghĩa như UC-18.
  - Lăn chuột để cuộn tay.
  - Đổi tốc độ trên màn chiếu được gửi ngược về màn điều khiển: thanh trượt cập nhật và giá trị được lưu.
  - Vị trí và trạng thái chạy trên màn điều khiển bám theo màn chiếu (cập nhật 10 lần/giây).
  - Phím `+`/`−` đổi cỡ chữ không có tác dụng trên màn chiếu.

### UC-37 — Đồng bộ trực tiếp kịch bản và cài đặt

**User story:** Là người vận hành, tôi muốn sửa kịch bản hay chỉnh hiển thị ngay khi đang phát sóng và MC thấy thay đổi tức thì.

- **Tiêu chí chấp nhận:**
  - Sửa chữ → màn chiếu cập nhật sau khoảng 250 ms, giữ nguyên vị trí cuộn.
  - Đổi cài đặt → màn chiếu áp dụng ngay.
  - Mọi lệnh điều khiển (chạy/dừng, nhảy, cuộn) thực hiện đồng thời trên cả hai màn.

### UC-38 — Gợi ý thao tác và tự ẩn con trỏ

**User story:** Là MC, tôi muốn màn chiếu sạch, không có con trỏ chuột hay thông báo che chữ.

- **Tiêu chí chấp nhận:**
  - Khi vừa bật chiếu, hiện dòng gợi ý "Màn hình chiếu nhắc chữ · nhấn Esc để tắt chiếu" rồi tự mờ đi sau 2,5 giây.
  - Con trỏ chuột tự ẩn sau 2 giây không di chuyển, hiện lại khi rê chuột.
  - Không thể bôi chọn chữ trên màn chiếu.

---

## 7. Cửa sổ ứng dụng

### UC-39 — Chỉ chạy một phiên bản ứng dụng

**User story:** Là người vận hành, tôi muốn lỡ mở phần mềm lần hai thì quay lại cửa sổ đang chạy, tránh hai phiên bản giành màn chiếu.

- **Tiêu chí chấp nhận:** Mở lần hai → tiến trình mới tự thoát; cửa sổ điều khiển hiện có được khôi phục (nếu đang thu nhỏ) và đưa lên trước.

### UC-40 — Hành vi cửa sổ điều khiển

**User story:** Là người vận hành, tôi muốn màn điều khiển gọn, mở ra là dùng được.

- **Tiêu chí chấp nhận:**
  - Mở ở trạng thái phóng to; kích thước tối thiểu 980×620; không có thanh menu.
  - Bố cục hai cột (kịch bản | xem trước và điều khiển); cửa sổ hẹp dưới 900 px chuyển thành một cột.
  - Đóng cửa sổ điều khiển → thoát ứng dụng và đóng luôn màn chiếu.
  - Tiêu đề cửa sổ hiện "BHN Prompter <phiên bản>".

---

## 8. Thông tin phần mềm

### UC-41 — Xem giới thiệu và phiên bản

**User story:** Là người dùng, tôi muốn xem phiên bản và thông tin liên hệ nhà phát triển khi cần hỗ trợ.

- **Tiêu chí chấp nhận:**
  - Chân màn điều khiển luôn hiện tên phần mềm, số phiên bản, website `bhnmedia.vn` và hotline.
  - Bấm "ⓘ Giới thiệu" mở hộp thoại gồm: mô tả ngắn, phiên bản, nền tảng (Windows 64-bit kèm phiên bản Electron), đơn vị phát triển, website, hotline.
  - Đóng hộp thoại bằng nút "Đóng", phím `Esc` hoặc nhấp ra ngoài.
  - Từ hộp thoại có nút tắt sang "Kiểm tra cập nhật".

---

## 9. Cập nhật phần mềm

Nhóm này do module tài khoản BHN cung cấp và cần phiên đăng nhập hợp lệ; ở đây chỉ mô tả phần cập nhật.

### UC-42 — Kiểm tra bản mới

**User story:** Là người dùng, tôi muốn biết khi có phiên bản mới để dùng bản đã sửa lỗi.

- **Tiêu chí chấp nhận:**
  - Hệ thống tự kiểm tra sau khi vào phần mềm và định kỳ 6 giờ một lần.
  - Người dùng tự kiểm tra bằng "⟳ Kiểm tra cập nhật" ở chân màn hình hoặc trong hộp thoại Giới thiệu.
  - Có bản mới → chân màn hình hiện nhãn "Có bản mới vX.Y.Z"; bấm nhãn để xem chi tiết (số phiên bản, danh sách thay đổi theo từng bản).

### UC-43 — Tải và cài bản cập nhật

**User story:** Là người dùng, tôi muốn cập nhật ngay trong phần mềm, không phải tự tải bộ cài.

- **Luồng chính:**
  1. Người dùng chọn cập nhật.
  2. Hệ thống tải bộ cài về thư mục tạm, hiển thị tiến độ tải.
  3. Hệ thống kiểm tra chữ ký số của bản phát hành, kích thước và mã SHA-256 của file.
  4. Hệ thống chạy bộ cài ở chế độ im lặng, thoát phần mềm, rồi tự mở lại bản mới.
  5. Bản mới hiện thông báo "✔ Đã cập nhật BHN Prompter lên phiên bản X" trong 5 giây.
- **Luồng thay thế / ngoại lệ:**
  - File đúng mã đã tải sẵn từ trước → dùng lại, không tải lại.
  - Sai chữ ký, sai kích thước hoặc sai mã → hủy file, báo lỗi, không cài.
  - Mất mạng → báo không kết nối được máy chủ.
  - Với bản không bắt buộc, người dùng có thể chọn "Để sau".

### UC-44 — Cập nhật bắt buộc

**User story:** Là nhà phát hành, tôi muốn buộc người dùng lên phiên bản mới khi bản cũ có lỗi nghiêm trọng.

- **Tiêu chí chấp nhận:**
  - Bản mới được đánh dấu bắt buộc → hộp thoại cập nhật tự mở (một lần cho mỗi phiên bản) mà không cần người dùng bấm.
  - Hộp thoại ghi rõ "bắt buộc cập nhật".

---

## 10. Ghi chú thêm từ mã nguồn

- **Nhánh chạy trên trình duyệt:** `index.html` vẫn giữ nhánh "bản demo trên trình duyệt" (mở màn chiếu dạng cửa sổ bật lên, kéo sang màn phụ rồi nhấn `F` hoặc nhấp đúp để toàn màn hình, dùng Window Management API để dò màn hình). Bản cài đặt `.exe` không đi qua nhánh này.
- **Hàm chưa dùng:** ứng dụng có sẵn kênh mở liên kết `https://` bằng trình duyệt mặc định, nhưng giao diện 1.3.0 chưa gọi tới.
- **Không có trong bản 1.3.0** (không tìm thấy trong mã): quản lý nhiều kịch bản, nhập Word/PDF, điều khiển từ xa qua mạng/điện thoại, bàn đạp/remote chuyên dụng, cuộn theo giọng nói, định dạng chữ đậm/nghiêng theo từng từ, đồng hồ/bấm giờ trên màn chiếu, tùy chọn ngôn ngữ giao diện (chỉ có tiếng Việt).
