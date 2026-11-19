/** Chỉ số màu nhấn `{1}`…`{5}` (mã màu nằm trong cài đặt `c1`…`c5`). */
export type ColorIndex = 1 | 2 | 3 | 4 | 5;

/** Một đoạn trong dòng thường: chữ MC đọc, hoặc ghi chú dàn dựng `[...]`. */
export interface Segment {
  kind: "text" | "cue";
  text: string;
  /** Định dạng chữ, chỉ dùng khi `kind: "text"`. */
  color?: ColorIndex;
  bold?: boolean;
  italic?: boolean;
}

export type Line =
  { kind: "gap" } | { kind: "head"; text: string } | { kind: "text"; segments: Segment[] };

/**
 * Ký tự thoát `\\`, `\*`, `\{` (chữ thường, không phải thẻ), ghi chú `[...]`, mở màu `{1}`–`{5}`,
 * đóng màu `{/}`, bật/tắt đậm `**`, bật/tắt nghiêng `*`.
 */
const TOKEN = /\\[\\*{]|\[[^\]]*\]|\{[1-5]\}|\{\/\}|\*\*|\*/g;

/**
 * Tách một dòng thường thành các đoạn. Định dạng chỉ có hiệu lực trong dòng:
 * thẻ chưa đóng tự đóng ở cuối dòng. Ghi chú luôn giữ màu ghi chú, không nhận định dạng.
 */
export function splitLine(line: string): Segment[] {
  const segments: Segment[] = [];
  let color: ColorIndex | undefined;
  let bold = false;
  let italic = false;

  const pushText = (text: string) => {
    if (!text) return;
    const prev = segments[segments.length - 1];
    if (
      prev?.kind === "text" &&
      prev.color === color &&
      !!prev.bold === bold &&
      !!prev.italic === italic
    ) {
      prev.text += text;
      return;
    }
    const seg: Segment = { kind: "text", text };
    if (color) seg.color = color;
    if (bold) seg.bold = true;
    if (italic) seg.italic = true;
    segments.push(seg);
  };

  let last = 0;
  for (const m of line.matchAll(TOKEN)) {
    pushText(line.slice(last, m.index));
    last = m.index + m[0].length;
    const tok = m[0];
    if (tok[0] === "\\") pushText(tok[1]);
    else if (tok[0] === "[") segments.push({ kind: "cue", text: tok });
    else if (tok === "{/}") color = undefined;
    else if (tok === "**") bold = !bold;
    else if (tok === "*") italic = !italic;
    else color = Number(tok[1]) as ColorIndex;
  }
  pushText(line.slice(last));
  return segments;
}

/**
 * Tách kịch bản thành các dòng hiển thị, mỗi dòng nguồn ứng với đúng một phần tử
 * (chỉ số dòng trong ô soạn thảo = chỉ số trong mảng trả về).
 *
 * - Dòng trống → khoảng trống.
 * - Dòng bắt đầu bằng `##` → tiêu đề (bỏ các dấu `#`), không tách ghi chú.
 * - Dòng khác → chữ thường, phần `[...]` là ghi chú dàn dựng; `{1}…{/}`…`{5}…{/}` tô màu,
 *   `**…**` in đậm, `*…*` in nghiêng.
 */
export function parseScript(text: string): Line[] {
  return text.split(/\r?\n/).map((raw): Line => {
    const trimmed = raw.trim();
    if (!trimmed) return { kind: "gap" };
    if (trimmed.startsWith("##")) return { kind: "head", text: trimmed.replace(/^#+\s*/, "") };
    const segments = splitLine(raw);
    // Dòng chỉ có thẻ định dạng (vd. `{1}{/}`) không còn chữ → coi như khoảng trống để giữ chiều cao dòng.
    return segments.length ? { kind: "text", segments } : { kind: "gap" };
  });
}

export const SAMPLE_SCRIPT = [
  "## CHÀO MỪNG",
  "[MC bước ra giữa sân khấu – nhạc nền nhỏ dần]",
  "Kính thưa quý vị đại biểu, thưa toàn thể quý vị khách quý!",
  "Chào mừng quý vị đến với chương trình ngày hôm nay.",
  "",
  "Đây là nội dung mẫu của máy nhắc chữ.",
  "Hãy dán kịch bản của bạn vào ô soạn thảo bên trái.",
  "",
  "## HƯỚNG DẪN NHANH",
  "Dòng bắt đầu bằng hai dấu thăng sẽ hiện thành tiêu đề màu xanh.",
  "Phần nằm trong [ngoặc vuông] là ghi chú dàn dựng, hiện màu vàng – MC không đọc.",
  "Bôi đen chữ rồi bấm nút trên ô soạn thảo để tô {1}đỏ{/}, {2}cam{/}, {3}vàng{/}, {4}xanh lá{/}, {5}xanh dương{/}.",
  "Nhấn mạnh bằng **chữ đậm** hoặc *chữ nghiêng*, có thể kết hợp: {1}**rất quan trọng**{/}.",
  "Nhấn phím cách để chạy hoặc tạm dừng, mũi tên lên xuống để tăng giảm tốc độ.",
  "",
  "[Dừng 3 giây – chờ khán giả vỗ tay]",
  "Xin trân trọng cảm ơn quý vị!",
].join("\n");
