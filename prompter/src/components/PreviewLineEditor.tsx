import { useLayoutEffect, useRef } from "react";
import type { RefObject } from "react";
import { setClassRule } from "../lib/dynamicSheet";
import { lineHtml, serializeLine } from "../script/richText";
import { activeTab, useStore } from "../state/store";
import { readLines } from "./RichEditor";

const HEAD_PREFIX = /^\s*#+\s*/;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

interface Props {
  /** Chỉ số dòng nguồn đang sửa. */
  index: number;
  /** Khung bọc xem trước (gốc định vị của ô sửa). */
  wrapRef: RefObject<HTMLDivElement | null>;
  boxRef: RefObject<HTMLDivElement | null>;
  onClose: () => void;
}

/**
 * Ô sửa một dòng ngay trên khung xem trước: phủ đúng chỗ dòng đó, cùng cỡ chữ/màu.
 * Enter hoặc bấm ra ngoài thì lưu, Esc thì hủy. Định dạng sẵn có của dòng được giữ.
 */
export function PreviewLineEditor({ index, wrapRef, boxRef, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const done = useRef(false);
  const src = useRef("");

  useLayoutEffect(() => {
    const el = ref.current;
    const wrap = wrapRef.current;
    const txt = boxRef.current?.querySelector<HTMLElement>(".txt");
    const line = txt?.children[index] as HTMLElement | undefined;
    if (!el || !wrap || !txt || !line) {
      onClose();
      return;
    }
    const w = wrap.getBoundingClientRect();
    const r = line.getBoundingClientRect();
    const t = getComputedStyle(txt);
    const l = getComputedStyle(line);
    setClassRule(
      ".pv-edit",
      `left: ${(r.left - w.left).toFixed(1)}px; top: ${(r.top - w.top).toFixed(1)}px; width: ${r.width.toFixed(1)}px; min-height: ${r.height.toFixed(1)}px; font-size: ${t.fontSize}; line-height: ${t.lineHeight}; font-family: ${t.fontFamily}; font-weight: ${l.fontWeight}; text-align: ${t.textAlign}; text-transform: ${t.textTransform};`,
    );
    src.current = activeTab(useStore.getState()).text.split(/\r?\n/)[index] ?? "";
    const head = HEAD_PREFIX.exec(src.current);
    if (head && src.current.trim().startsWith("##")) {
      el.classList.add("ln", "head");
      el.innerHTML = esc(src.current.slice(head[0].length));
    } else {
      const tpl = document.createElement("template");
      tpl.innerHTML = lineHtml(src.current);
      el.innerHTML = (tpl.content.firstChild as HTMLElement).innerHTML;
    }
    el.focus({ preventScroll: true });
    const sel = document.getSelection();
    sel?.selectAllChildren(el);
    sel?.collapseToEnd();
  }, [index, wrapRef, boxRef, onClose]);

  const finish = (save: boolean) => {
    const el = ref.current;
    if (done.current || !el) return;
    done.current = true;
    if (save) {
      const head = HEAD_PREFIX.exec(src.current);
      const next = el.classList.contains("head")
        ? `${head?.[0] ?? "## "}${(el.textContent ?? "").replace(/\s*\n\s*/g, " ")}`
        : serializeLine(readLines(el).flat());
      if (next !== src.current) {
        const { setText } = useStore.getState();
        const lines = activeTab(useStore.getState()).text.split(/\r?\n/);
        lines[index] = next;
        setText(lines.join("\n"));
      }
    }
    onClose();
  };

  return (
    <div
      ref={ref}
      className="reader pv-edit"
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-label={`Sửa dòng ${index + 1}`}
      spellCheck={false}
      onBlur={() => finish(true)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          finish(true);
        } else if (e.key === "Escape") {
          e.preventDefault();
          finish(false);
        }
      }}
      onPaste={(e) => {
        // Một dòng: dán chữ thường, xuống dòng đổi thành dấu cách.
        e.preventDefault();
        const text = e.clipboardData.getData("text/plain").replace(/\s*\r?\n\s*/g, " ");
        document.execCommand("insertText", false, text);
      }}
    />
  );
}
