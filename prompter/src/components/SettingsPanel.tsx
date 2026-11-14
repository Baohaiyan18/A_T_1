import { FONTS, RANGES } from "../settings";
import type { Settings } from "../settings";
import { useStore } from "../state/store";
import { ColorPicker } from "./ColorPicker";
import { Icon } from "./Icon";

type RangeKey = keyof typeof RANGES;

const RANGE_ROWS: { key: RangeKey; label: string; format: (v: number) => string }[] = [
  { key: "fontSize", label: "Cỡ chữ", format: (v) => `${v}px` },
  { key: "lineHeight", label: "Giãn dòng", format: (v) => v.toFixed(2) },
  { key: "margin", label: "Lề hai bên", format: (v) => `${v}%` },
  { key: "markerPos", label: "Vị trí vạch đọc", format: (v) => `${v}%` },
];

const COLORS: { key: "fg" | "bg" | "cue" | "head"; label: string }[] = [
  { key: "fg", label: "Màu chữ" },
  { key: "bg", label: "Màu nền" },
  { key: "cue", label: "Màu ghi chú [ ]" },
  { key: "head", label: "Màu tiêu đề ##" },
];

const CHECKS: { key: "mirrorH" | "mirrorV" | "upper" | "marker"; label: string }[] = [
  { key: "mirrorH", label: "Lật gương ngang (máy nhắc chữ có kính)" },
  { key: "mirrorV", label: "Lật dọc" },
  { key: "upper", label: "CHỮ IN HOA" },
  { key: "marker", label: "Hiện vạch đọc" },
];

export function SettingsPanel() {
  const s = useStore((st) => st.settings);
  const set = useStore((st) => st.setSetting);
  const setSpeed = useStore((st) => st.setSpeed);

  return (
    <>
      <div className="grp">
        <div className="row speedrow">
          <label htmlFor="set-speed">Tốc độ chạy</label>
          <button className="sm icon-btn" title="Giảm tốc độ" onClick={() => setSpeed(s.speed - 1)}>
            <Icon name="minus" size={14} />
          </button>
          <input
            id="set-speed"
            type="range"
            {...RANGES.speed}
            value={s.speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
          />
          <button className="sm icon-btn" title="Tăng tốc độ" onClick={() => setSpeed(s.speed + 1)}>
            <Icon name="plus" size={14} />
          </button>
          <output>{s.speed.toFixed(1)}</output>
        </div>
        {RANGE_ROWS.map(({ key, label, format }) => (
          <div className="row" key={key}>
            <label htmlFor={`set-${key}`}>{label}</label>
            <input
              id={`set-${key}`}
              type="range"
              {...RANGES[key]}
              value={s[key]}
              onChange={(e) => set(key, parseFloat(e.target.value))}
            />
            <output>{format(s[key])}</output>
          </div>
        ))}
      </div>

      <div className="opts">
        <label className="opt">
          <span>Font chữ</span>
          <select value={s.font} onChange={(e) => set("font", e.target.value)}>
            {FONTS.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </label>
        <label className="opt">
          <span>Căn chữ</span>
          <select
            value={s.align}
            onChange={(e) => set("align", e.target.value as Settings["align"])}
          >
            <option value="left">Trái</option>
            <option value="center">Giữa</option>
          </select>
        </label>
        <label className="opt">
          <span>Đếm ngược khi bắt đầu</span>
          <select
            value={s.countdown}
            onChange={(e) => set("countdown", Number(e.target.value) as Settings["countdown"])}
          >
            <option value={0}>Tắt</option>
            <option value={3}>3 giây</option>
            <option value={5}>5 giây</option>
          </select>
        </label>
        {COLORS.map(({ key, label }) => (
          <ColorPicker
            key={key}
            id={key}
            label={label}
            value={s[key]}
            onChange={(hex) => set(key, hex)}
          />
        ))}
        {CHECKS.map(({ key, label }) => (
          <label className="chk" key={key}>
            <input type="checkbox" checked={s[key]} onChange={(e) => set(key, e.target.checked)} />
            {label}
          </label>
        ))}
      </div>
    </>
  );
}
