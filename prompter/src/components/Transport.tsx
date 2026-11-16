import { memo } from "react";
import { Button } from "@astryxdesign/core/Button";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Slider } from "@astryxdesign/core/Slider";
import type { Prompter } from "../hooks/usePrompter";
import { mmss } from "../lib/format";
import { RANGES } from "../settings";
import { useStore } from "../state/store";
import { Icon } from "./Icon";

/** Độ mịn của thanh tua: 1000 bước trên toàn kịch bản. */
const SCRUB_STEPS = 1000;

const formatPercent = (v: number) => `${Math.round((v / SCRUB_STEPS) * 100)}%`;

/** Thanh tua (kéo, nhấp hoặc dùng phím mũi tên để nhảy vị trí), phần trăm và thời gian còn lại. */
export const Progress = memo(function Progress({ prompter }: { prompter: Prompter }) {
  const progress = useStore((s) => s.playback.progress);
  const secondsLeft = useStore((s) => s.playback.secondsLeft);
  const value = Math.round(progress * SCRUB_STEPS);
  return (
    <div className="prog">
      <Slider
        label="Tiến độ kịch bản"
        isLabelHidden
        min={0}
        max={SCRUB_STEPS}
        step={1}
        value={value}
        valueDisplay="none"
        formatValue={formatPercent}
        width="100%"
        onChange={(v: number) => prompter.seekRatio(v / SCRUB_STEPS)}
      />
      <div className="times">
        <span>{formatPercent(value)}</span>
        <span>Còn lại: {secondsLeft === null ? "--:--" : mmss(secondsLeft)}</span>
      </div>
    </div>
  );
});

const formatSpeed = (v: number) => v.toFixed(1);

/** Tốc độ chạy: nút −/+ (bước 1) và thanh trượt (bước 0,5). */
const SpeedRow = memo(function SpeedRow() {
  const speed = useStore((s) => s.settings.speed);
  const setSpeed = useStore((s) => s.setSpeed);
  return (
    <div className="speed">
      <IconButton
        size="sm"
        variant="ghost"
        label="Giảm tốc độ"
        tooltip="Giảm tốc độ (↓)"
        icon={<Icon name="minus" size={14} />}
        onClick={() => setSpeed(useStore.getState().settings.speed - 1)}
      />
      <div className="speed-slider">
        <Slider
          label="Tốc độ chạy"
          isLabelHidden
          {...RANGES.speed}
          value={speed}
          valueDisplay="text"
          formatValue={formatSpeed}
          width="100%"
          onChange={(v: number) => setSpeed(v)}
        />
      </div>
      <IconButton
        size="sm"
        variant="ghost"
        label="Tăng tốc độ"
        tooltip="Tăng tốc độ (↑)"
        icon={<Icon name="plus" size={14} />}
        onClick={() => setSpeed(useStore.getState().settings.speed + 1)}
      />
    </div>
  );
});

export const Transport = memo(function Transport({ prompter }: { prompter: Prompter }) {
  const running = useStore((s) => s.playback.running);
  return (
    <div className="transport" role="toolbar" aria-label="Điều khiển chạy chữ">
      <IconButton
        size="lg"
        label="Về đầu"
        tooltip="Về đầu (Home)"
        icon={<Icon name="skip-back" size={18} />}
        onClick={() => prompter.cmd({ action: "reset" })}
      />
      <IconButton
        size="lg"
        label="Lùi 3 dòng"
        tooltip="Lùi 3 dòng (PageUp)"
        icon={<Icon name="rewind" size={18} />}
        onClick={() => prompter.cmd({ action: "lines", value: -3 })}
      />
      <Button
        size="lg"
        width={160}
        variant={running ? "destructive" : "primary"}
        label={running ? "DỪNG" : "CHẠY"}
        tooltip="Chạy / Dừng (Space)"
        icon={<Icon name={running ? "pause" : "play"} size={18} />}
        onClick={() => prompter.cmd({ action: "toggle" })}
      />
      <IconButton
        size="lg"
        label="Tới 3 dòng"
        tooltip="Tới 3 dòng (PageDown)"
        icon={<Icon name="fast-forward" size={18} />}
        onClick={() => prompter.cmd({ action: "lines", value: 3 })}
      />
      <SpeedRow />
    </div>
  );
});
