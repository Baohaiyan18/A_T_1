import { useMemo, useRef } from "react";
import { Footer } from "../components/Footer";
import { Preview } from "../components/Preview";
import { ProjectionBar } from "../components/ProjectionBar";
import { ScriptEditor } from "../components/ScriptEditor";
import { SettingsPanel } from "../components/SettingsPanel";
import type { StageHandle } from "../components/Stage";
import { Progress, Transport } from "../components/Transport";
import { usePrompter } from "../hooks/usePrompter";
import { parseScript } from "../script/parse";
import { useStore } from "../state/store";
import "./ControlWindow.css";

/** Màn điều khiển: soạn kịch bản, xem trước, điều khiển chạy chữ và cài đặt hiển thị. */
export function ControlWindow() {
  const text = useStore((s) => s.text);
  const lines = useMemo(() => parseScript(text), [text]);
  const stage = useRef<StageHandle>(null);
  const prompter = usePrompter(stage);

  return (
    <div className="ctl">
      <header>
        <div className="brand">
          <img className="brand-logo" src="/logo.png" alt="Prompter Logo" />
          <div className="brand-text">
            Prompter
            <small>Phần mềm máy nhắc chữ</small>
          </div>
        </div>
        <ProjectionBar />
      </header>

      <main>
        <ScriptEditor prompter={prompter} />

        <section className="card right">
          <div className="bar">
            <h3>Xem trước (giống màn chiếu, không lật gương)</h3>
            <span className="hint">Nhấp vào dòng để đưa lên vạch đọc · lăn chuột để cuộn</span>
          </div>
          <Preview stageRef={stage} lines={lines} prompter={prompter} />
          <Progress prompter={prompter} />
          <Transport prompter={prompter} />
          <SettingsPanel />
          <div className="keys">
            <kbd>Space</kbd> chạy/dừng · <kbd>↑</kbd>
            <kbd>↓</kbd> tăng/giảm tốc độ (<kbd>Shift</kbd> ×5) · <kbd>←</kbd>
            <kbd>→</kbd> lùi/tới 1 dòng · <kbd>PgUp</kbd>
            <kbd>PgDn</kbd> lùi/tới 3 dòng · <kbd>Home</kbd> về đầu · <kbd>+</kbd>
            <kbd>−</kbd> cỡ chữ · <kbd>Ctrl</kbd>+<kbd>Enter</kbd> chạy từ con trỏ
            <br />
            Trên màn chiếu: các phím trên dùng được luôn (trừ cỡ chữ) · <kbd>Esc</kbd> tắt chiếu.
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
