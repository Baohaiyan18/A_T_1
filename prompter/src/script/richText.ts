import { splitLine } from "./parse";
import type { ColorIndex } from "./parse";

/**
 * Mô hình cho ô soạn thảo trực quan. Kịch bản vẫn lưu dạng chữ có thẻ (`{1}…{/}`, `**`, `*`),
 * mỗi dòng nguồn là một dòng trong ô soạn thảo; ô soạn thảo chỉ hiện chữ đã định dạng.
 * Vị trí tính theo chữ nhìn thấy (không tính thẻ), đơn vị là ký tự UTF-16 như vùng chọn của DOM.
 */

/** Một ký tự nhìn thấy cùng định dạng của nó. */
export interface Ch {
  ch: string;
  c?: ColorIndex;
  b?: boolean;
  i?: boolean;
}

export interface Pos {
  line: number;
  off: number;
}

export type Mark = { kind: "b" } | { kind: "i" } | { kind: "c"; color: ColorIndex | undefined };

/** Định dạng của vùng chọn để tô sáng nút trên thanh công cụ. */
export interface Marks {
  b: boolean;
  i: boolean;
  c: ColorIndex | undefined;
}

const CUE = /\[[^\]]*\]/g;

const isHead = (visible: string) => visible.trimStart().startsWith("##");

/** Đánh dấu các ký tự thuộc ghi chú `[...]` (ghi chú không nhận định dạng). */
function cueMask(visible: string): boolean[] {
  const mask = new Array<boolean>(visible.length).fill(false);
  for (const m of visible.matchAll(CUE)) mask.fill(true, m.index, m.index + m[0].length);
  return mask;
}

/** Các ký tự nhìn thấy của một dòng nguồn. Dòng tiêu đề `##` hiện nguyên văn. */
export function lineChars(src: string): Ch[] {
  if (isHead(src)) return Array.from({ length: src.length }, (_, k) => ({ ch: src[k] }));
  const out: Ch[] = [];
  for (const seg of splitLine(src)) {
    for (let k = 0; k < seg.text.length; k++) {
      const x: Ch = { ch: seg.text[k] };
      if (seg.kind === "text") {
        if (seg.color) x.c = seg.color;
        if (seg.bold) x.b = true;
        if (seg.italic) x.i = true;
      }
      out.push(x);
    }
  }
  return out;
}

/** Ngược lại với `lineChars`: dựng dòng nguồn có thẻ, thoát các ký tự trùng với thẻ. */
export function serializeLine(chars: Ch[]): string {
  const visible = chars.map((x) => x.ch).join("");
  if (isHead(visible)) return visible;
  const cue = cueMask(visible);
  let out = "";
  let c: ColorIndex | undefined;
  let b = false;
  let i = false;
  for (let k = 0; k < chars.length; k++) {
    const ch = visible[k];
    // Ghi chú ghi nguyên văn: trình đọc nhận cả đoạn `[...]` trước mọi thẻ bên trong.
    if (cue[k]) {
      out += ch;
      continue;
    }
    const x = chars[k];
    if (x.c !== c) {
      out += x.c ? `{${x.c}}` : "{/}";
      c = x.c;
    }
    if (!!x.b !== b) {
      out += "**";
      b = !b;
    }
    if (!!x.i !== i) {
      out += "*";
      i = !i;
    }
    const tag = ch === "{" && /^\{(?:[1-5]|\/)\}/.test(visible.slice(k, k + 3));
    out += ch === "\\" || ch === "*" || tag ? `\\${ch}` : ch;
  }
  if (b) out += "**";
  if (i) out += "*";
  if (c) out += "{/}";
  return out;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** HTML của một dòng trong ô soạn thảo (một `div` mỗi dòng; dòng trống giữ `<br>` để có chiều cao). */
export function lineHtml(src: string): string {
  if (isHead(src)) return `<div class="ln head">${esc(src)}</div>`;
  const segs = splitLine(src);
  if (!segs.length) return "<div><br></div>";
  const inner = segs
    .map((seg) => {
      const cls =
        seg.kind === "cue"
          ? "cue"
          : [seg.color && `c${seg.color}`, seg.bold && "b", seg.italic && "i"]
              .filter(Boolean)
              .join(" ");
      return cls ? `<span class="${cls}">${esc(seg.text)}</span>` : esc(seg.text);
    })
    .join("");
  return `<div>${inner}</div>`;
}

/** Đổi chữ thường (không có thẻ) thành các dòng ký tự cùng một định dạng. */
export function plainLines(text: string, fmt: Omit<Ch, "ch"> = {}): Ch[][] {
  return text
    .split(/\r?\n/)
    .map((l) => Array.from({ length: l.length }, (_, k) => ({ ...fmt, ch: l[k] })));
}

/** Định dạng nên dùng cho chữ gõ/chèn tại `pos`: theo ký tự ngay trước, đầu dòng thì theo ký tự sau. */
export function fmtAt(src: string[], pos: Pos): Omit<Ch, "ch"> {
  const chars = lineChars(src[pos.line] ?? "");
  const x = chars[pos.off - 1] ?? chars[pos.off];
  return x ? { c: x.c, b: x.b, i: x.i } : {};
}

const before = (a: Pos, b: Pos) => a.line < b.line || (a.line === b.line && a.off <= b.off);

/** Sắp hai đầu vùng chọn theo thứ tự. */
export function ordered(a: Pos, b: Pos): [Pos, Pos] {
  return before(a, b) ? [a, b] : [b, a];
}

/** Thay đoạn `a..b` bằng các dòng `ins` (`[[]]` = xóa). Trả về nguồn mới và vị trí con trỏ sau đoạn chèn. */
export function replaceRange(
  src: string[],
  a: Pos,
  b: Pos,
  ins: Ch[][],
): { src: string[]; caret: Pos } {
  const first = lineChars(src[a.line]);
  const last = a.line === b.line ? first : lineChars(src[b.line]);
  const lines = (ins.length ? ins : [[]]).map((l) => l.slice());
  const end = lines.length - 1;
  const caret = { line: a.line + end, off: (end === 0 ? a.off : 0) + lines[end].length };
  lines[0] = first.slice(0, a.off).concat(lines[0]);
  lines[end] = lines[end].concat(last.slice(b.off));
  return {
    src: [...src.slice(0, a.line), ...lines.map(serializeLine), ...src.slice(b.line + 1)],
    caret,
  };
}

/** Gọi `fn` cho từng ký tự không phải ghi chú trong đoạn `a..b`. */
function eachChar(src: string[], a: Pos, b: Pos, fn: (x: Ch, line: number) => void): Ch[][] {
  const lines: Ch[][] = [];
  for (let l = a.line; l <= b.line; l++) {
    const chars = lineChars(src[l]);
    const cue = cueMask(chars.map((x) => x.ch).join(""));
    const to = l === b.line ? b.off : chars.length;
    for (let k = l === a.line ? a.off : 0; k < to; k++) if (!cue[k]) fn(chars[k], l);
    lines.push(chars);
  }
  return lines;
}

/** Định dạng chung của đoạn `a..b`; đoạn rỗng thì theo ký tự cạnh con trỏ. */
export function marksIn(src: string[], a: Pos, b: Pos): Marks {
  if (a.line === b.line && a.off === b.off) {
    const f = fmtAt(src, a);
    return { b: !!f.b, i: !!f.i, c: f.c };
  }
  let n = 0;
  let bold = true;
  let italic = true;
  let color: ColorIndex | undefined | null = null;
  eachChar(src, a, b, (x) => {
    n++;
    bold &&= !!x.b;
    italic &&= !!x.i;
    color = color === null || color === x.c ? x.c : undefined;
  });
  return n ? { b: bold, i: italic, c: color ?? undefined } : { b: false, i: false, c: undefined };
}

/**
 * Áp định dạng cho đoạn `a..b` (bỏ qua ghi chú và dòng tiêu đề). Đậm/nghiêng là bật/tắt:
 * cả đoạn đã có thì gỡ, chưa thì thêm cho cả đoạn.
 */
export function applyMark(src: string[], a: Pos, b: Pos, mark: Mark): string[] {
  const on = mark.kind === "c" || !marksIn(src, a, b)[mark.kind];
  const lines = eachChar(src, a, b, (x) => {
    if (mark.kind === "c") {
      if (mark.color) x.c = mark.color;
      else delete x.c;
    } else if (on) x[mark.kind] = true;
    else delete x[mark.kind];
  });
  return [...src.slice(0, a.line), ...lines.map(serializeLine), ...src.slice(b.line + 1)];
}
