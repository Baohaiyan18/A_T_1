import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Selector } from "@astryxdesign/core/Selector";
import { Slider } from "@astryxdesign/core/Slider";
import { Switch } from "@astryxdesign/core/Switch";
import { listFonts, mergeFonts } from "../bridge/fonts";
import { RANGES } from "../settings";
import type { Settings } from "../settings";
import { useStore } from "../state/store";
import { ColorPicker } from "./ColorPicker";

type RangeKey = Exclude<keyof typeof RANGES, "speed">;
type ColorKey = "fg" | "bg" | "cue" | "head" | "c1" | "c2" | "c3" | "c4" | "c5";
type CheckKey = "mirrorH" | "mirrorV" | "upper" | "marker" | "showTimer";

const RANGE_ROWS: { key: RangeKey; label: string; format: (v: number) => string }[] = [
  { key: "fontSize", label: "Cỡ chữ", format: (v) => `${v}px` },
  { key: "lineHeight", label: "Giãn dòng", format: (v) => v.toFixed(2) },
  { key: "margin", label: "Lề hai bên", format: (v) => `${v}%` },
  { key: "markerPos", label: "Vị trí vạch đọc", format: (v) => `${v}%` },
];

const COLORS: { key: ColorKey; label: string }[] = [
  { key: "fg", label: "Màu chữ" },
  { key: "bg", label: "Màu nền" },
  { key: "cue", label: "Màu ghi chú [ ]" },
  { key: "head", label: "Màu tiêu đề ##" },
  { key: "c1", label: "Màu 1 {1} (đỏ)" },
  { key: "c2", label: "Màu 2 {2} (cam)" },
  { key: "c3", label: "Màu 3 {3} (vàng)" },
  { key: "c4", label: "Màu 4 {4} (xanh lá)" },
  { key: "c5", label: "Màu 5 {5} (xanh dương)" },
];

const CHECKS: { key: CheckKey; label: string }[] = [
  { key: "mirrorH", label: "Lật gương ngang (máy nhắc chữ có kính)" },
  { key: "mirrorV", label: "Lật dọc" },
  { key: "upper", label: "CHỮ IN HOA" },
  { key: "marker", label: "Hiện vạch đọc" },
  { key: "showTimer", label: "Hiện đồng hồ trên màn chiếu" },
];

/** Mỗi hàng chỉ theo dõi đúng một trường cài đặt, nên kéo một thanh trượt không làm vẽ lại cả bảng. */
function useSetting<K extends keyof Settings>(key: K): Settings[K] {
  return useStore((s) => s.settings[key]);
}

const RangeRow = memo(function RangeRow({
  settingKey,
  label,
  format,
}: {
  settingKey: RangeKey;
  label: string;
  format: (v: number) => string;
}) {
  const value = useSetting(settingKey);
  const set = useStore((s) => s.setSetting);
  return (
    <div className="row">
      <div className="row-slider">
        <Slider
          label={label}
          {...RANGES[settingKey]}
          value={value}
          valueDisplay="text"
          formatValue={format}
          width="100%"
          onChange={(v: number) => set(settingKey, v)}
        />
      </div>
    </div>
  );
});

const ColorRow = memo(function ColorRow({
  settingKey,
  label,
}: {
  settingKey: ColorKey;
  label: string;
}) {
  const value = useSetting(settingKey);
  const set = useStore((s) => s.setSetting);
  const onChange = useCallback((hex: string) => set(settingKey, hex), [set, settingKey]);
  return <ColorPicker id={settingKey} label={label} value={value} onChange={onChange} />;
});

const SwitchRow = memo(function SwitchRow({
  settingKey,
  label,
}: {
  settingKey: CheckKey;
  label: string;
}) {
  const value = useSetting(settingKey);
  const set = useStore((s) => s.setSetting);
  return (
    <Switch
      label={label}
      value={value}
      size="sm"
      labelPosition="start"
      labelSpacing="spread"
      width="100%"
      onChange={(checked: boolean) => set(settingKey, checked)}
    />
  );
});

const TextOptions = memo(function TextOptions() {
  const font = useSetting("font");
  const align = useSetting("align");
  const set = useStore((s) => s.setSetting);
  const [systemFonts, setSystemFonts] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    void listFonts()
      .then((list) => {
        if (!cancelled) setSystemFonts(list);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const fontOptions = useMemo(
    () => mergeFonts(systemFonts, font).map((f) => ({ value: f, label: f })),
    [systemFonts, font],
  );

  return (
    <div className="opts opts-type">
      <Selector
        label="Font chữ"
        options={fontOptions}
        value={font}
        width="100%"
        hasSearch
        searchPlaceholder="Tìm font..."
        emptySearchText="Không tìm thấy font"
        onChange={(v: string | null) => v && set("font", v)}
      />
      <div className="opt-field">
        <span className="opt-label" aria-hidden="true">
          Căn chữ
        </span>
        <SegmentedControl
          className="seg-match"
          label="Căn chữ"
          layout="fill"
          value={align}
          onChange={(v) => set("align", v as Settings["align"])}
        >
          <SegmentedControlItem value="left" label="Trái" />
          <SegmentedControlItem value="center" label="Giữa" />
        </SegmentedControl>
      </div>
    </div>
  );
});

export const SettingsPanel = memo(function SettingsPanel() {
  return (
    <div className="settings">
      <fieldset className="grp">
        <legend className="grp-title">Bố cục chữ</legend>
        {RANGE_ROWS.map(({ key, label, format }) => (
          <RangeRow key={key} settingKey={key} label={label} format={format} />
        ))}
      </fieldset>

      <fieldset className="grp">
        <legend className="grp-title">Kiểu chữ</legend>
        <TextOptions />
      </fieldset>

      <fieldset className="grp">
        <legend className="grp-title">Màu sắc</legend>
        <div className="opts opts-2col">
          {COLORS.map(({ key, label }) => (
            <ColorRow key={key} settingKey={key} label={label} />
          ))}
        </div>
      </fieldset>

      <fieldset className="grp">
        <legend className="grp-title">Hiển thị trên màn chiếu</legend>
        <div className="opts opts-2col">
          {CHECKS.map(({ key, label }) => (
            <SwitchRow key={key} settingKey={key} label={label} />
          ))}
        </div>
      </fieldset>
    </div>
  );
});
