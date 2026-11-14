/** Một đoạn trong dòng thường: chữ MC đọc, hoặc ghi chú dàn dựng `[...]`. */
export interface Segment {
  kind: "text" | "cue";
  text: string;
}

export type Line =
  { kind: "gap" } | { kind: "head"; text: string } | { kind: "text"; segments: Segment[] };

const CUE = /\[[^\]]*\]/g;

function splitCues(line: string): Segment[] {
  const segments: Segment[] = [];
  let last = 0;
  for (const m of line.matchAll(CUE)) {
    if (m.index > last) segments.push({ kind: "text", text: line.slice(last, m.index) });
    segments.push({ kind: "cue", text: m[0] });
    last = m.index + m[0].length;
  }
  if (last < line.length) segments.push({ kind: "text", text: line.slice(last) });
  return segments;
}

/**
 * Tách kịch bản thành các dòng hiển thị, mỗi dòng nguồn ứng với đúng một phần tử
 * (chỉ số dòng trong ô soạn thảo = chỉ số trong mảng trả về).
 *
 * - Dòng trống → khoảng trống.
 * - Dòng bắt đầu bằng `##` → tiêu đề (bỏ các dấu `#`), không tách ghi chú.
 * - Dòng khác → chữ thường, phần `[...]` là ghi chú dàn dựng.
 */
export function parseScript(text: string): Line[] {
  return text.split(/\r?\n/).map((raw): Line => {
    const trimmed = raw.trim();
    if (!trimmed) return { kind: "gap" };
    if (trimmed.startsWith("##")) return { kind: "head", text: trimmed.replace(/^#+\s*/, "") };
    return { kind: "text", segments: splitCues(raw) };
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
  "Nhấn phím cách để chạy hoặc tạm dừng, mũi tên lên xuống để tăng giảm tốc độ.",
  "",
  "[Dừng 3 giây – chờ khán giả vỗ tay]",
  "Xin trân trọng cảm ơn quý vị!",
].join("\n");
