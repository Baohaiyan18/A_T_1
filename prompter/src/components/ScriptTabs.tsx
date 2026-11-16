import { memo, useRef, useState } from "react";
import { AlertDialog } from "@astryxdesign/core/AlertDialog";
import { IconButton } from "@astryxdesign/core/IconButton";
import { useShallow } from "zustand/react/shallow";
import type { Prompter } from "../hooks/usePrompter";
import { useStore } from "../state/store";
import { Icon } from "./Icon";

/** Dải tab kịch bản: chọn, thêm, đóng (có xác nhận), nhấp đúp tên để đổi tên. */
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
        <div className="tablist" role="tablist" aria-label="Các tab kịch bản">
          {ids.map((id, i) => (
            <div key={id} role="presentation" className={id === activeId ? "tab active" : "tab"}>
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
                  title="Nhấp đúp để đổi tên"
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
                  <Icon name="x" size={12} />
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
