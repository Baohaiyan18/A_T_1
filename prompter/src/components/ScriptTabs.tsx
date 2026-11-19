import { memo, useRef, useState } from "react";
import type { PointerEvent } from "react";
import { AlertDialog } from "@astryxdesign/core/AlertDialog";
import { IconButton } from "@astryxdesign/core/IconButton";
import { useShallow } from "zustand/react/shallow";
import type { Prompter } from "../hooks/usePrompter";
import { useStore } from "../state/store";
import { Icon } from "./Icon";

/** Dải tab kịch bản: chọn, thêm, kéo thả đổi chỗ, đóng (có xác nhận), nhấp đúp tên để đổi tên. */
export const ScriptTabs = memo(function ScriptTabs({ prompter }: { prompter: Prompter }) {
  // Chỉ theo dõi id/tên để gõ kịch bản không vẽ lại dải tab.
  const ids = useStore(useShallow((s) => s.tabs.map((t) => t.id)));
  const names = useStore(useShallow((s) => s.tabs.map((t) => t.name)));
  const activeId = useStore((s) => s.activeId);
  const [editing, setEditing] = useState<{ id: string; draft: string } | null>(null);
  const [closing, setClosing] = useState<string | null>(null);
  const closingName = closing ? names[ids.indexOf(closing)] : "";
  // Enter/Esc đã xử lý xong thì bỏ qua sự kiện blur khi ô nhập biến mất (Esc phải là hủy).
  const skipBlur = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  // Thả chuột sau khi kéo thì bỏ qua cú nhấp kèm theo (không chọn tab).
  const skipClick = useRef(false);

  /** Kéo tab (sau khi rê quá 5px) sang chỗ tab khác; qua nửa tab bên cạnh thì đổi chỗ. */
  const startDrag = (e: PointerEvent<HTMLDivElement>, id: string) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest(".tab-close, input")) return;
    const x0 = e.clientX;
    const y0 = e.clientY;
    let moved = false;
    const onMove = (ev: globalThis.PointerEvent) => {
      if (!moved) {
        if (Math.hypot(ev.clientX - x0, ev.clientY - y0) < 5) return;
        moved = true;
        setDragId(id);
      }
      const els = Array.from(listRef.current?.children ?? []);
      const rects = els.map((el) => el.getBoundingClientRect());
      const to = rects.findIndex(
        (r) =>
          ev.clientX >= r.left &&
          ev.clientX <= r.right &&
          ev.clientY >= r.top &&
          ev.clientY <= r.bottom,
      );
      const from = useStore.getState().tabs.findIndex((t) => t.id === id);
      if (to < 0 || from < 0 || to === from) return;
      const r = rects[to];
      const mid = r.left + r.width / 2;
      const sameRow = Math.abs(r.top - rects[from].top) < 1;
      if (sameRow && (to > from ? ev.clientX < mid : ev.clientX > mid)) return;
      useStore.getState().moveTab(id, to);
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      if (!moved) return;
      setDragId(null);
      skipClick.current = true;
      setTimeout(() => (skipClick.current = false));
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  const startRename = (id: string, name: string) => {
    skipBlur.current = false;
    setEditing({ id, draft: name });
  };

  const finishRename = (save: boolean) => {
    if (save && editing) useStore.getState().renameTab(editing.id, editing.draft);
    setEditing(null);
  };

  const add = () => prompter.selectTab(useStore.getState().addTab());

  return (
    <>
      <div className="tabs">
        <div className="tablist" role="tablist" aria-label="Các tab kịch bản" ref={listRef}>
          {ids.map((id, i) => (
            <div
              key={id}
              role="presentation"
              className={`tab${id === activeId ? " active" : ""}${id === dragId ? " dragging" : ""}`}
              onPointerDown={(e) => startDrag(e, id)}
              onClickCapture={(e) => {
                if (skipClick.current) e.stopPropagation();
              }}
            >
              {editing?.id === id ? (
                <input
                  className="tab-input"
                  aria-label="Tên tab"
                  autoFocus
                  value={editing.draft}
                  onFocus={(e) => e.currentTarget.select()}
                  onChange={(e) => setEditing({ id, draft: e.target.value })}
                  onBlur={() => {
                    if (skipBlur.current) skipBlur.current = false;
                    else finishRename(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter" && e.key !== "Escape") return;
                    e.preventDefault();
                    skipBlur.current = true;
                    finishRename(e.key === "Enter");
                  }}
                />
              ) : (
                <button
                  type="button"
                  role="tab"
                  className="tab-name"
                  aria-selected={id === activeId}
                  title="Nhấp đúp để đổi tên · kéo để đổi chỗ"
                  onClick={() => prompter.selectTab(id)}
                  onDoubleClick={() => startRename(id, names[i])}
                >
                  {names[i]}
                </button>
              )}
              {ids.length > 1 && (
                <button
                  type="button"
                  className="tab-close"
                  aria-label={`Đóng ${names[i]}`}
                  title="Đóng tab"
                  onClick={() => setClosing(id)}
                >
                  <Icon name="x" size={10} />
                </button>
              )}
            </div>
          ))}
        </div>
        <IconButton
          size="sm"
          variant="ghost"
          label="Thêm tab kịch bản"
          tooltip="Thêm tab kịch bản"
          icon={<Icon name="plus" size={14} />}
          onClick={add}
        />
      </div>
      <AlertDialog
        isOpen={closing !== null}
        onOpenChange={(open) => !open && setClosing(null)}
        title={`Đóng "${closingName}"?`}
        description="Nội dung kịch bản trong tab này sẽ bị xóa và không khôi phục được."
        cancelLabel="Hủy"
        actionLabel="Đóng tab"
        onAction={() => {
          if (closing) prompter.closeTab(closing);
          setClosing(null);
        }}
      />
    </>
  );
});
