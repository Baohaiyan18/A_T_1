import {
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { Ref } from "react";
import type { ColorIndex } from "../script/parse";
import {
  applyMark,
  fmtAt,
  lineChars,
  lineHtml,
  marksIn,
  ordered,
  plainLines,
  replaceRange,
  serializeLine,
} from "../script/richText";
import type { Ch, Mark, Marks, Pos } from "../script/richText";
import { useShallow } from "zustand/react/shallow";
import { setClassRule } from "../lib/dynamicSheet";
import { useStore } from "../state/store";

export interface RichEditorHandle {
  /** Dòng đang đặt con trỏ (chỉ số dòng nguồn). */
  caretLine(): number;
  focus(): void;
}

interface Props {
  text: string;
  onChange: (text: string) => void;
  labelledBy: string;
  onRunFromCursor: () => void;
  ref?: Ref<RichEditorHandle>;
}

type Sel = [Pos, Pos];
interface Snap {
  src: string[];
  sel: Sel | null;
}

const HISTORY_MAX = 200;
/** Các lần gõ liên tiếp cùng kiểu trong khoảng này gộp thành một bước hoàn tác. */
const GROUP_MS = 800;
const NBSP = new RegExp(String.fromCharCode(0xa0), "g");
const BLOCK = /^(DIV|P|LI|H[1-6]|PRE|BLOCKQUOTE)$/;
const COLORS: ColorIndex[] = [1, 2, 3, 4, 5];
const COLOR_NAMES = ["đỏ", "cam", "vàng", "xanh lá", "xanh dương"];

/**
 * Màu nền/chữ/ghi chú/tiêu đề/5 màu của ô soạn thảo (class `.reader`) lấy từ cài đặt
 * màn chiếu vì màu nhấn (nhất là vàng) không đủ tương phản trên nền sáng của app.
 * Thanh định dạng (`.fmtbar`) dùng 5 màu nhấn cho các nút màu.
 */
export function useReaderColors() {
  // Chỉ theo dõi các trường màu để đổi tốc độ/cỡ chữ không vẽ lại.
  const s = useStore(
    useShallow(({ settings: c }) => ({
      bg: c.bg,
      fg: c.fg,
      cue: c.cue,
      head: c.head,
      c1: c.c1,
      c2: c.c2,
      c3: c.c3,
      c4: c.c4,
      c5: c.c5,
    })),
  );
  useLayoutEffect(() => {
    const accents = `--c1: ${s.c1}; --c2: ${s.c2}; --c3: ${s.c3}; --c4: ${s.c4}; --c5: ${s.c5};`;
    setClassRule(
      ".reader",
      `background: ${s.bg}; color: ${s.fg}; --cue: ${s.cue}; --head: ${s.head}; ${accents}`,
    );
    setClassRule(".fmtbar", accents);
  }, [s.bg, s.fg, s.cue, s.head, s.c1, s.c2, s.c3, s.c4, s.c5]);
}

// ---- Vùng chọn DOM <-> vị trí (dòng, ký tự nhìn thấy) ----

function posOf(root: HTMLElement, node: Node, off: number): Pos {
  const n = root.children.length;
  if (node === root) {
    if (off < n) return { line: off, off: 0 };
    return { line: n - 1, off: root.children[n - 1]?.textContent?.length ?? 0 };
  }
  let line: Node = node;
  while (line.parentNode && line.parentNode !== root) line = line.parentNode;
  const index = Array.prototype.indexOf.call(root.children, line) as number;
  const r = document.createRange();
  r.setStart(line, 0);
  r.setEnd(node, off);
  return { line: Math.max(0, index), off: r.toString().length };
}

function getSel(root: HTMLElement): Sel | null {
  const s = document.getSelection();
  if (!s || !s.rangeCount || !s.anchorNode || !s.focusNode) return null;
  if (!root.contains(s.anchorNode) || !root.contains(s.focusNode)) return null;
  return [posOf(root, s.anchorNode, s.anchorOffset), posOf(root, s.focusNode, s.focusOffset)];
}

function point(root: HTMLElement, p: Pos): [Node, number] {
  const line = root.children[Math.min(p.line, root.children.length - 1)];
  if (!line) return [root, 0];
  const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
  let left = p.off;
  let last: Text | null = null;
  for (let t = walker.nextNode() as Text | null; t; t = walker.nextNode() as Text | null) {
    if (left <= t.length) return [t, left];
    left -= t.length;
    last = t;
  }
  return last ? [last, last.length] : [line, 0];
}

function setSel(root: HTMLElement, [a, b]: Sel) {
  const [n1, o1] = point(root, a);
  const [n2, o2] = point(root, b);
  document.getSelection()?.setBaseAndExtent(n1, o1, n2, o2);
}

// ---- Đọc chữ đã định dạng từ DOM ----

/** Chuẩn hóa một màu CSS về dạng trình duyệt trả ra (`rgb(…)`) để so với bảng màu. */
function cssColor(value: string): string {
  const probe = document.createElement("span");
  probe.style.color = value;
  return probe.style.color;
}

/** Định dạng của một phần tử. Ngoài class của chính ô soạn thảo, nhận cả thẻ/kiểu trình duyệt tự chèn. */
function fmtOf(el: HTMLElement, f: Omit<Ch, "ch">, palette: string[]): Omit<Ch, "ch"> {
  const g = { ...f };
  const cl = el.classList;
  for (const n of COLORS) if (cl.contains(`c${n}`)) g.c = n;
  if (cl.contains("b") || el.tagName === "B" || el.tagName === "STRONG") g.b = true;
  if (cl.contains("i") || el.tagName === "I" || el.tagName === "EM") g.i = true;
  const { fontWeight, fontStyle } = el.style;
  if (fontWeight) g.b = fontWeight === "bold" || Number(fontWeight) >= 700;
  if (fontStyle) g.i = fontStyle === "italic";
  const color = el.style.color || el.getAttribute("color");
  if (color) {
    const k = palette.indexOf(cssColor(color));
    g.c = k >= 0 ? COLORS[k] : undefined;
  }
  return g;
}

/** Đọc các dòng chữ trong `node`: mỗi khối (`div`) là một dòng, `<br>` cuối khối chỉ giữ chiều cao. */
export function readLines(node: Node): Ch[][] {
  const { c1, c2, c3, c4, c5 } = useStore.getState().settings;
  const palette = [c1, c2, c3, c4, c5].map(cssColor);
  const lines: Ch[][] = [];
  let cur: Ch[] | null = null;
  const open = () => {
    if (!cur) {
      cur = [];
      lines.push(cur);
    }
    return cur;
  };
  const walk = (parent: Node, f: Omit<Ch, "ch">) => {
    for (const child of parent.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        (child.nodeValue ?? "").split("\n").forEach((part, k) => {
          if (k) cur = null;
          const line = open();
          for (const ch of part.replace(NBSP, " ")) line.push({ ...f, ch });
        });
      } else if (child instanceof HTMLElement) {
        if (child.tagName === "BR") {
          open();
          cur = null;
          continue;
        }
        const block = BLOCK.test(child.tagName);
        if (block) cur = null;
        const count = lines.length;
        walk(child, fmtOf(child, f, palette));
        if (block) {
          if (lines.length === count) lines.push([]);
          cur = null;
        }
      }
    }
  };
  walk(node, {});
  return lines;
}

/**
 * Ô soạn thảo trực quan: hiện chữ đã tô màu/đậm/nghiêng, không hiện thẻ. Kịch bản vẫn lưu dạng chữ
 * có thẻ, mỗi dòng nguồn là một `div`. Gõ chữ trong một dòng để trình duyệt tự xử lý; xuống dòng,
 * nối dòng, dán, xóa nhiều dòng, định dạng và hoàn tác đều làm trên mô hình rồi dựng lại.
 */
export const RichEditor = memo(function RichEditor({
  text,
  onChange,
  labelledBy,
  onRunFromCursor,
  ref,
}: Props) {
  useReaderColors();
  const rootRef = useRef<HTMLDivElement>(null);
  const src = useRef<string[]>([]);
  const last = useRef<string | null>(null);
  const undo = useRef<Snap[]>([]);
  const redo = useRef<Snap[]>([]);
  const group = useRef({ type: "", at: 0 });
  /** Vùng chọn cuối cùng trong ô soạn thảo, dùng khi focus đang ở chỗ khác. */
  const saved = useRef<Sel | null>(null);
  const [marks, setMarks] = useState<Marks>({ b: false, i: false, c: undefined });
  const latest = useRef({ onChange, onRunFromCursor });
  useLayoutEffect(() => {
    latest.current = { onChange, onRunFromCursor };
  });

  // Nội dung đổi từ bên ngoài (mở file…) thì dựng lại toàn bộ.
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || text === last.current) return;
    last.current = text;
    src.current = text.split(/\r?\n/);
    root.innerHTML = src.current.map(lineHtml).join("");
  }, [text]);

  const ed = useCallback(() => {
    const root = rootRef.current!;
    const refreshMarks = (sel: Sel) => {
      const [a, b] = ordered(...sel);
      const m = marksIn(src.current, a, b);
      setMarks((p) => (p.b === m.b && p.i === m.i && p.c === m.c ? p : m));
    };
    const commit = (lines: string[], sel: Sel | null, full: boolean) => {
      src.current = lines;
      if (full) root.innerHTML = lines.map(lineHtml).join("");
      if (sel) {
        setSel(root, sel);
        saved.current = sel;
        refreshMarks(sel);
      }
      const t = lines.join("\n");
      if (t !== last.current) {
        last.current = t;
        latest.current.onChange(t);
      }
    };
    const snapshot = (): Snap => ({ src: src.current, sel: getSel(root) ?? saved.current });
    const pushHistory = (type: string) => {
      const now = performance.now();
      const g = group.current;
      if (type && type === g.type && now - g.at < GROUP_MS) {
        g.at = now;
        return;
      }
      group.current = { type, at: now };
      undo.current.push(snapshot());
      if (undo.current.length > HISTORY_MAX) undo.current.shift();
      redo.current = [];
    };
    const travel = (from: Snap[], to: Snap[]) => {
      const s = from.pop();
      if (!s) return;
      to.push(snapshot());
      group.current = { type: "", at: 0 };
      commit(s.src, s.sel, true);
    };
    const replace = (a: Pos, b: Pos, ins: Ch[][]) => {
      pushHistory("");
      const r = replaceRange(src.current, a, b, ins);
      commit(r.src, [r.caret, r.caret], true);
    };
    const format = (mark: Mark) => {
      const sel = getSel(root) ?? saved.current;
      if (!sel) return;
      const [a, b] = ordered(...sel);
      root.focus({ preventScroll: true });
      if (a.line === b.line && a.off === b.off) return;
      pushHistory("");
      commit(applyMark(src.current, a, b, mark), sel, true);
    };
    /** Sau khi trình duyệt tự sửa trong một dòng: đọc lại dòng đó, dựng lại nếu DOM lệch chuẩn. */
    const sync = () => {
      const sel = getSel(root);
      const line = sel ? ordered(...sel)[0].line : -1;
      const div = root.children[line];
      const aligned =
        div &&
        root.children.length === src.current.length &&
        root.childNodes.length === root.children.length;
      const read = aligned ? readLines(div) : [];
      if (aligned && read.length <= 1) {
        const s = serializeLine(read[0] ?? []);
        const next = src.current.slice();
        next[line] = s;
        const tpl = document.createElement("template");
        tpl.innerHTML = lineHtml(s);
        const canon = tpl.content.firstChild!;
        const restore = !canon.isEqualNode(div);
        if (restore) div.replaceWith(canon);
        commit(next, restore ? sel : null, false);
        return;
      }
      // Trình duyệt đổi cấu trúc ngoài dự kiến: đọc lại toàn bộ.
      const next = readLines(root).map(serializeLine);
      commit(next.length ? next : [""], sel, true);
    };
    const lineLen = (l: number) => root.children[l]?.textContent?.length ?? 0;

    const onBeforeInput = (e: InputEvent) => {
      const t = e.inputType;
      if (t === "historyUndo" || t === "historyRedo") {
        e.preventDefault();
        if (t === "historyUndo") travel(undo.current, redo.current);
        else travel(redo.current, undo.current);
        return;
      }
      if (t === "formatBold" || t === "formatItalic") {
        e.preventDefault();
        format({ kind: t === "formatBold" ? "b" : "i" });
        return;
      }
      if (t === "insertCompositionText") return;
      const sel = getSel(root);
      if (!sel) {
        e.preventDefault();
        return;
      }
      let [a, b] = ordered(...sel);
      if (t.startsWith("delete")) {
        const target = e.getTargetRanges?.()[0];
        if (target) {
          a = posOf(root, target.startContainer, target.startOffset);
          b = posOf(root, target.endContainer, target.endOffset);
        } else if (a.line === b.line && a.off === b.off) {
          if (t.endsWith("Backward") && a.off === 0 && a.line > 0)
            a = { line: a.line - 1, off: lineLen(a.line - 1) };
          if (
            t.endsWith("Forward") &&
            b.off === lineLen(b.line) &&
            b.line < root.children.length - 1
          )
            b = { line: b.line + 1, off: 0 };
        }
        if (a.line === b.line) {
          pushHistory(t);
          return;
        }
        e.preventDefault();
        replace(a, b, [[]]);
        return;
      }
      if (t === "insertText" && a.line === b.line) {
        pushHistory(t);
        return;
      }
      e.preventDefault();
      if (t === "insertParagraph" || t === "insertLineBreak") replace(a, b, [[], []]);
      else if (t === "insertText") replace(a, b, plainLines(e.data ?? "", fmtAt(src.current, a)));
      else if (t.startsWith("insertFrom") || t === "insertReplacementText") {
        const target = e.getTargetRanges?.()[0];
        if (target && t === "insertFromDrop") {
          a = b = posOf(root, target.startContainer, target.startOffset);
        }
        // Dán chữ có thẻ (vd. kịch bản .txt cũ) thì giữ định dạng.
        const data = e.dataTransfer?.getData("text/plain") ?? e.data ?? "";
        replace(a, b, data.split(/\r?\n/).map(lineChars));
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const k = e.key.toLowerCase();
      if (k === "enter") {
        e.preventDefault();
        latest.current.onRunFromCursor();
      } else if (k === "z" || k === "y") {
        e.preventDefault();
        if (k === "z" && !e.shiftKey) travel(undo.current, redo.current);
        else travel(redo.current, undo.current);
      } else if (k === "b" || k === "i") {
        e.preventDefault();
        format({ kind: k });
      } else if (k === "u") e.preventDefault();
    };

    return {
      root,
      format,
      sync,
      onBeforeInput,
      onKeyDown,
      pushHistory,
      onSelection: () => {
        const sel = getSel(root);
        if (!sel) return;
        saved.current = sel;
        refreshMarks(sel);
      },
    };
  }, []);

  const api = useRef<ReturnType<typeof ed> | null>(null);

  useEffect(() => {
    const e = ed();
    api.current = e;
    const { root } = e;
    const onInput = (ev: Event) => {
      if (!(ev as InputEvent).isComposing) e.sync();
    };
    const onCompStart = () => e.pushHistory("compose");
    const onDrag = (ev: Event) => ev.preventDefault();
    root.addEventListener("beforeinput", e.onBeforeInput);
    root.addEventListener("input", onInput);
    root.addEventListener("compositionstart", onCompStart);
    root.addEventListener("compositionend", e.sync);
    root.addEventListener("keydown", e.onKeyDown);
    root.addEventListener("dragstart", onDrag);
    document.addEventListener("selectionchange", e.onSelection);
    return () => {
      root.removeEventListener("beforeinput", e.onBeforeInput);
      root.removeEventListener("input", onInput);
      root.removeEventListener("compositionstart", onCompStart);
      root.removeEventListener("compositionend", e.sync);
      root.removeEventListener("keydown", e.onKeyDown);
      root.removeEventListener("dragstart", onDrag);
      document.removeEventListener("selectionchange", e.onSelection);
    };
  }, [ed]);

  useImperativeHandle(
    ref,
    () => ({
      caretLine: () => {
        const root = rootRef.current;
        const sel = (root && getSel(root)) ?? saved.current;
        return sel ? ordered(...sel)[0].line : 0;
      },
      focus: () => {
        const root = rootRef.current;
        if (!root) return;
        root.focus({ preventScroll: true });
        if (saved.current) setSel(root, saved.current);
      },
    }),
    [],
  );

  const btn = (label: string, title: string, pressed: boolean, mark: Mark, cls: string) => (
    <button
      key={cls}
      type="button"
      className={`fmt-btn ${cls}`}
      aria-pressed={pressed}
      aria-label={title}
      title={title}
      // Giữ vùng chọn trong ô soạn thảo khi bấm nút.
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => api.current?.format(mark)}
    >
      {label}
    </button>
  );

  return (
    <>
      <div className="fmtbar" role="toolbar" aria-label="Định dạng chữ">
        {btn("B", "Đậm (Ctrl+B)", marks.b, { kind: "b" }, "fmt-b")}
        {btn("I", "Nghiêng (Ctrl+I)", marks.i, { kind: "i" }, "fmt-i")}
        <span className="fmt-sep" aria-hidden="true" />
        {COLORS.map((n) =>
          btn(
            "A",
            `Màu ${n} (${COLOR_NAMES[n - 1]})`,
            marks.c === n,
            { kind: "c", color: n },
            `fmt-c c${n}`,
          ),
        )}
        {btn("A", "Bỏ màu", false, { kind: "c", color: undefined }, "fmt-c fmt-none")}
        <span className="fmt-hint">Bôi đen chữ rồi bấm nút để định dạng</span>
      </div>
      <div
        ref={rootRef}
        className={text ? "reader rich" : "reader rich is-empty"}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-labelledby={labelledBy}
        spellCheck={false}
        data-placeholder="Dán kịch bản vào đây..."
      />
    </>
  );
});
