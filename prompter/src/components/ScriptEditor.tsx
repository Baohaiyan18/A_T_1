import { memo, useRef, useState } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { openScriptFile, saveScriptFile } from "../bridge/files";
import type { Prompter } from "../hooks/usePrompter";
import { useStore } from "../state/store";
import { Icon } from "./Icon";

export const ScriptEditor = memo(function ScriptEditor({ prompter }: { prompter: Prompter }) {
  const text = useStore((s) => s.text);
  const setText = useStore((s) => s.setText);
  const area = useRef<HTMLTextAreaElement>(null);
  const [error, setError] = useState("");

  const fromCursor = () => {
    const ta = area.current;
    if (!ta) return;
    const index = ta.value.slice(0, ta.selectionStart).split("\n").length - 1;
    prompter.seekLine(index);
  };

  const open = async () => {
    setError("");
    try {
      const content = await openScriptFile();
      if (content === null) return;
      setText(content);
      prompter.cmd({ action: "reset" });
    } catch (err) {
      setError(String(err));
    }
  };

  const save = async () => {
    setError("");
    try {
      await saveScriptFile(useStore.getState().text);
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
      <textarea
        ref={area}
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
      <div className="tip">
        Dòng bắt đầu bằng <code>##</code> → tiêu đề màu xanh · Chữ trong <code>[ngoặc vuông]</code>{" "}
        → ghi chú dàn dựng màu vàng (MC không đọc). Kịch bản tự lưu trên máy.
      </div>
    </section>
  );
});
