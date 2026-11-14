import type { Prompter } from "../hooks/usePrompter";
import { mmss } from "../lib/format";
import { useStore } from "../state/store";
import { Icon } from "./Icon";

/** Thanh tiến độ (nhấp để nhảy vị trí), phần trăm và thời gian còn lại. */
export function Progress({ prompter }: { prompter: Prompter }) {
  const { progress, secondsLeft } = useStore((s) => s.playback);
  return (
    <div className="prog">
      <progress
        className="track"
        max={100}
        value={Number((progress * 100).toFixed(1))}
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          prompter.seekRatio((e.clientX - r.left) / r.width);
        }}
      />
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
      <button
        className="icon-btn"
        title="Về đầu (Home)"
        onClick={() => prompter.cmd({ action: "reset" })}
      >
        <Icon name="skip-back" size={18} />
      </button>
      <button
        className="icon-btn"
        title="Lùi 3 dòng (PageUp)"
        onClick={() => prompter.cmd({ action: "lines", value: -3 })}
      >
        <Icon name="rewind" size={18} />
      </button>
      <button
        className={running ? "play playing" : "play primary"}
        title="Chạy / Dừng (Space)"
        onClick={() => prompter.cmd({ action: "toggle" })}
      >
        <Icon name={running ? "pause" : "play"} size={18} />
        {running ? "DỪNG" : "CHẠY"}
      </button>
      <button
        className="icon-btn"
        title="Tới 3 dòng (PageDown)"
        onClick={() => prompter.cmd({ action: "lines", value: 3 })}
      >
        <Icon name="fast-forward" size={18} />
      </button>
    </div>
  );
}
