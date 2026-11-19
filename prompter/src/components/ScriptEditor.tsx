import { memo, useRef, useState } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { openScriptFile, saveScriptFile } from "../bridge/files";
import type { Prompter } from "../hooks/usePrompter";
import { activeTab, useActiveText, useStore } from "../state/store";
import { Icon } from "./Icon";
import { RichEditor } from "./RichEditor";
import type { RichEditorHandle } from "./RichEditor";
import { ScriptTabs } from "./ScriptTabs";

export const ScriptEditor = memo(function ScriptEditor({ prompter }: { prompter: Prompter }) {
  const text = useActiveText();
  const activeId = useStore((s) => s.activeId);
  const setText = useStore((s) => s.setText);
  const area = useRef<RichEditorHandle>(null);
  const [error, setError] = useState("");

  const fromCursor = () => {
    if (area.current) prompter.seekLine(area.current.caretLine());
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
      {/* Đổi `key` theo tab để mỗi tab có ô gõ riêng (lịch sử hoàn tác không lẫn giữa các tab). */}
      <RichEditor
        key={activeId}
        ref={area}
        labelledBy="script-heading"
        text={text}
        onChange={setText}
        onRunFromCursor={fromCursor}
      />
      <div className="tip">
        Dòng bắt đầu bằng <code>##</code> → tiêu đề · Chữ trong <code>[ngoặc vuông]</code> → ghi chú
        dàn dựng (MC không đọc) · Bôi đen chữ rồi bấm nút phía trên để tô màu, in đậm, in nghiêng.
        Kịch bản tự lưu trên máy.
      </div>
    </section>
  );
});
