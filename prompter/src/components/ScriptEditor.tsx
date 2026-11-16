import { memo, useEffect, useRef, useState } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { openScriptFile, saveScriptFile } from "../bridge/files";
import type { Prompter } from "../hooks/usePrompter";
import { activeTab, useActiveText, useStore } from "../state/store";
import { Icon } from "./Icon";
import { ScriptReader } from "./ScriptReader";
import { ScriptTabs } from "./ScriptTabs";

export const ScriptEditor = memo(function ScriptEditor({ prompter }: { prompter: Prompter }) {
  const text = useActiveText();
  const activeId = useStore((s) => s.activeId);
  const setText = useStore((s) => s.setText);
  const area = useRef<HTMLTextAreaElement>(null);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"md" | "preview">("md");
  const preview = mode === "preview";
  const backToMd = useRef(false);

  // Về MD thì trả focus cho ô gõ để gõ tiếp / Ctrl+Enter ngay (vị trí con trỏ vẫn giữ).
  // Làm sau khi render vì lúc đổi chế độ ô gõ còn đang ẩn.
  useEffect(() => {
    if (mode !== "md" || !backToMd.current) return;
    backToMd.current = false;
    area.current?.focus({ preventScroll: true });
  }, [mode]);

  const fromCursor = () => {
    const ta = area.current;
    if (!ta) return;
    const index = ta.value.slice(0, ta.selectionStart).split("\n").length - 1;
    prompter.seekLine(index);
  };

  const open = async () => {
    setError("");
    try {
      const file = await openScriptFile();
      if (file === null) return;
      const { addTab } = useStore.getState();
      prompter.selectTab(addTab(file.name, file.text));
    } catch (err) {
      setError(String(err));
    }
  };

  const save = async () => {
    setError("");
    try {
      const tab = activeTab(useStore.getState());
      await saveScriptFile(tab.text, tab.name);
    } catch (err) {
      setError(String(err));
    }
  };

  return (
    <section className="card editor" aria-labelledby="script-heading">
      <div className="bar">
        <h3 id="script-heading">Kịch bản</h3>
        <SegmentedControl
          label="Chế độ khung kịch bản"
          size="sm"
          value={mode}
          onChange={(v) => {
            backToMd.current = v === "md";
            setMode(v as "md" | "preview");
          }}
        >
          <SegmentedControlItem value="md" label="MD" />
          <SegmentedControlItem value="preview" label="Preview" />
        </SegmentedControl>
        <Button
          size="sm"
          label="Mở .txt"
          tooltip="Mở file .txt"
          icon={<Icon name="folder-open" size={14} />}
          clickAction={open}
        />
        <Button
          size="sm"
          label="Lưu .txt"
          tooltip="Lưu kịch bản ra file .txt"
          icon={<Icon name="save" size={14} />}
          clickAction={save}
        />
        <Button
          size="sm"
          label="Chạy từ con trỏ"
          tooltip="Đưa dòng đang đặt con trỏ lên vạch đọc (Ctrl+Enter)"
          icon={<Icon name="corner-right-up" size={14} />}
          isDisabled={preview}
          onClick={fromCursor}
        />
      </div>
      <ScriptTabs prompter={prompter} />
      {error && (
        <div className="editor-banner" role="alert">
          <Banner
            status="error"
            container="section"
            title="Thao tác tệp thất bại"
            description={error}
            isDismissable
            onDismiss={() => setError("")}
          />
        </div>
      )}
      {/* Ẩn chứ không bỏ textarea để giữ nguyên vị trí con trỏ khi quay lại MD.
          Đổi `key` theo tab để mỗi tab có ô gõ riêng (lịch sử hoàn tác không lẫn giữa các tab). */}
      <textarea
        key={activeId}
        ref={area}
        hidden={preview}
        aria-labelledby="script-heading"
        spellCheck={false}
        placeholder="Dán kịch bản vào đây..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            fromCursor();
          }
        }}
      />
      {preview && <ScriptReader />}
      <div className="tip">
        Dòng bắt đầu bằng <code>##</code> → tiêu đề màu xanh · Chữ trong <code>[ngoặc vuông]</code>{" "}
        → ghi chú dàn dựng màu vàng (MC không đọc) · <code>{"{1}chữ{/}"}</code>…
        <code>{"{5}chữ{/}"}</code> → tô màu · <code>**đậm**</code> · <code>*nghiêng*</code>. Kịch
        bản tự lưu trên máy.
      </div>
    </section>
  );
});
