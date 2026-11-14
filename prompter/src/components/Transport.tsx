import type { Prompter } from "../hooks/usePrompter";
import { mmss } from "../lib/format";
import { useStore } from "../state/store";

/** Thanh tiến độ (nhấp để nhảy vị trí), phần trăm và thời gian còn lại. */
export function Progress({ prompter }: { prompter: Prompter }) {
  const { progress, secondsLeft } = useStore((s) => s.playback);
  return (
    <div className="prog">
      <div
        className="track"
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          prompter.seekRatio((e.clientX - r.left) / r.width);
        }}
      >
        <div style={{ width: `${(progress * 100).toFixed(1)}%` }} />
      </div>
      <div className="times">
        <span>{Math.round(progress * 100)}%</span>
        <span>Còn lại: {secondsLeft === null ? "--:--" : mmss(secondsLeft)}</span>
      </div>
    </div>
  );
}

export function Transport({ prompter }: { prompter: Prompter }) {
  const running = useStore((s) => s.playback.running);
  return (
    <div className="transport">
      <button title="Về đầu (Home)" onClick={() => prompter.cmd({ action: "reset" })}>
        ⏮
      </button>
      <button
        title="Lùi 3 dòng (PageUp)"
        onClick={() => prompter.cmd({ action: "lines", value: -3 })}
      >
        ⏪
      </button>
      <button
        className={running ? "play playing" : "play primary"}
        title="Chạy / Dừng (Space)"
        onClick={() => prompter.cmd({ action: "toggle" })}
      >
        {running ? "⏸ DỪNG" : "▶ CHẠY"}
      </button>
      <button
        title="Tới 3 dòng (PageDown)"
        onClick={() => prompter.cmd({ action: "lines", value: 3 })}
      >
        ⏩
      </button>
    </div>
  );
}
