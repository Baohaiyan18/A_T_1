import { memo, useCallback } from "react";
import { Button } from "@astryxdesign/core/Button";
import { IconButton } from "@astryxdesign/core/IconButton";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Slider } from "@astryxdesign/core/Slider";
import { Switch } from "@astryxdesign/core/Switch";
import { TextArea } from "@astryxdesign/core/TextArea";
import { useStore } from "../state/store";
import { TICKER_RANGES, TICKER_SEPARATORS } from "../ticker";
import type { Ticker, TickerDir, TickerRangeKey } from "../ticker";
import { ColorPicker } from "./ColorPicker";
import { Icon } from "./Icon";

const SLIDERS: { key: TickerRangeKey; label: string; format: (v: number) => string }[] = [
  { key: "speed", label: "Tốc độ", format: (v) => `${v} px/s` },
  { key: "loops", label: "Số lượt chạy", format: (v) => (v === 0 ? "Lặp vô hạn" : `${v} lượt`) },
  { key: "fontSize", label: "Cỡ chữ", format: (v) => `${v}px` },
  { key: "len", label: "Độ dài dải chữ", format: (v) => `${v}%` },
  { key: "x", label: "Vị trí ngang", format: (v) => `${v}%` },
  { key: "y", label: "Vị trí dọc", format: (v) => `${v}%` },
];

const TickerCard = memo(function TickerCard({ t, index }: { t: Ticker; index: number }) {
  const update = useStore((s) => s.updateTicker);
  const remove = useStore((s) => s.removeTicker);
  const set = useCallback((patch: Partial<Ticker>) => update(t.id, patch), [update, t.id]);
  const setFg = useCallback((fg: string) => set({ fg }), [set]);
  const setBg = useCallback((bg: string) => set({ bg }), [set]);
  const name = `Chữ chạy ${index + 1}`;

  return (
    <fieldset className="grp">
      <legend className="grp-title">{name}</legend>
      <div className="tk-head">
        <Switch label="Hiện" value={t.on} size="sm" onChange={(on: boolean) => set({ on })} />
        <IconButton
          size="sm"
          variant="ghost"
          label={`Chạy lại ${name} từ đầu`}
          tooltip="Chạy lại từ đầu"
          icon={<Icon name="refresh-cw" size={14} />}
          onClick={() => set({ on: true, run: t.run + 1 })}
        />
        <IconButton
          size="sm"
          variant="ghost"
          label={`Xóa ${name}`}
          tooltip="Xóa"
          icon={<Icon name="trash" size={14} />}
          onClick={() => remove(t.id)}
        />
      </div>
      <TextArea
        label="Nội dung"
        value={t.text}
        rows={2}
        width="100%"
        hasSpellCheck={false}
        onChange={(text: string) => set({ text })}
      />
      <div className="opt-field">
        <span className="opt-label" aria-hidden="true">
          Hướng chạy
        </span>
        <SegmentedControl
          className="seg-match"
          label="Hướng chạy"
          layout="fill"
          value={t.dir}
          onChange={(v) => set({ dir: v as TickerDir })}
        >
          <SegmentedControlItem value="h" label="Ngang (phải → trái)" />
          <SegmentedControlItem value="v" label="Dọc (dưới → lên)" />
        </SegmentedControl>
      </div>
      <Switch
        label="Nối tiếp liên tục"
        value={t.seamless}
        size="sm"
        labelPosition="start"
        labelSpacing="spread"
        width="100%"
        onChange={(seamless: boolean) => set({ seamless })}
      />
      {t.seamless && (
        <>
          <div className="opt-field">
            <span className="opt-label" aria-hidden="true">
              Biểu tượng ngăn cách
            </span>
            <SegmentedControl
              className="seg-match"
              label="Biểu tượng ngăn cách"
              layout="fill"
              value={t.sep}
              onChange={(sep) => set({ sep })}
            >
              {TICKER_SEPARATORS.map((sep) => (
                <SegmentedControlItem key={sep} value={sep} label={sep || "Không"} />
              ))}
            </SegmentedControl>
          </div>
          <Slider
            label="Khoảng cách ngăn cách"
            {...TICKER_RANGES.gap}
            value={t.gap}
            valueDisplay="text"
            formatValue={(v: number) => `${v}px`}
            width="100%"
            onChange={(gap: number) => set({ gap })}
          />
        </>
      )}
      {SLIDERS.map(({ key, label, format }) => (
        <Slider
          key={key}
          label={key === "len" ? `${label} (${t.dir === "h" ? "bề rộng" : "chiều cao"})` : label}
          {...TICKER_RANGES[key]}
          value={t[key]}
          valueDisplay="text"
          formatValue={format}
          width="100%"
          onChange={(v: number) => set({ [key]: v })}
        />
      ))}
      <div className="opts opts-2col">
        <ColorPicker id={`${t.id}-fg`} label="Màu chữ" value={t.fg} onChange={setFg} />
        <ColorPicker id={`${t.id}-bg`} label="Màu nền" value={t.bg} onChange={setBg} />
      </div>
      <Switch
        label="Tô nền dải chữ"
        value={t.bgOn}
        size="sm"
        labelPosition="start"
        labelSpacing="spread"
        width="100%"
        onChange={(bgOn: boolean) => set({ bgOn })}
      />
    </fieldset>
  );
});

/** Danh sách các lớp chữ chạy: thêm, bật/tắt, sửa, xóa bất kỳ lúc nào (kể cả khi đang chiếu). */
export const TickerPanel = memo(function TickerPanel() {
  const tickers = useStore((s) => s.tickers);
  const add = useStore((s) => s.addTicker);
  return (
    <div className="settings">
      <p className="tk-tip">Kéo dải chữ trên khung xem trước để đặt vị trí.</p>
      {tickers.map((t, i) => (
        <TickerCard key={t.id} t={t} index={i} />
      ))}
      <Button
        label="Thêm chữ chạy"
        icon={<Icon name="plus" size={14} />}
        onClick={add}
        width="100%"
      />
    </div>
  );
});
