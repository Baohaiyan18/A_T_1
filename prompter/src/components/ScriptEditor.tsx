import { useRef, useState } from "react";
import { openScriptFile, saveScriptFile } from "../bridge/files";
import type { Prompter } from "../hooks/usePrompter";
import { useStore } from "../state/store";
import { Icon } from "./Icon";

export function ScriptEditor({ prompter }: { prompter: Prompter }) {
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
    <section className="card editor">
      <div className="bar">
        <h3>Kịch bản</h3>
        <button onClick={open} title="Mở file .txt">
          <Icon name="folder-open" /> Mở .txt
        </button>
        <button onClick={save} title="Lưu kịch bản ra file .txt">
          <Icon name="save" /> Lưu .txt
        </button>
        <button onClick={fromCursor} title="Đưa dòng đang đặt con trỏ lên vạch đọc (Ctrl+Enter)">
          <Icon name="corner-right-up" /> Chạy từ con trỏ
        </button>
      </div>
      {error && (
        <div className="err" role="alert">
          {error}
        </div>
      )}
      <textarea
        ref={area}
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
}
