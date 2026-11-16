import { memo } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Kbd } from "@astryxdesign/core/Kbd";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import type { Settings } from "../settings";
import { useStore } from "../state/store";
import { useThemeMode } from "../state/themeMode";
import { Icon } from "./Icon";
import { updater } from "./UpdateDialog";

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ["space"], label: "Chạy / dừng" },
  { keys: ["up", "down"], label: "Tăng / giảm tốc độ (giữ Shift ×5)" },
  { keys: ["left", "right"], label: "Lùi / tới 1 dòng" },
  { keys: ["PgUp", "PgDn"], label: "Lùi / tới 3 dòng" },
  { keys: ["Home"], label: "Về đầu" },
  { keys: ["plus", "-"], label: "Cỡ chữ" },
  { keys: ["mod+enter"], label: "Chạy từ con trỏ (trong ô kịch bản)" },
  { keys: ["escape"], label: "Tắt chiếu (trên màn chiếu)" },
];

/** Cài đặt app: giao diện, đếm ngược khi bắt đầu, phím tắt, kiểm tra cập nhật. */
export const AppSettingsDialog = memo(function AppSettingsDialog({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const mode = useThemeMode((s) => s.mode);
  const toggleMode = useThemeMode((s) => s.toggle);
  const countdown = useStore((s) => s.settings.countdown);
  const setSetting = useStore((s) => s.setSetting);

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} width={560} purpose="info">
      <DialogHeader title="Cài đặt" onOpenChange={onOpenChange} />
      <div className="dlg-body app-settings">
        <div className="opt-field">
          <span className="opt-label" aria-hidden="true">
            Giao diện
          </span>
          <SegmentedControl
            label="Giao diện"
            layout="fill"
            value={mode}
            onChange={(v) => v !== mode && toggleMode()}
          >
            <SegmentedControlItem value="light" label="Sáng" />
            <SegmentedControlItem value="dark" label="Tối" />
          </SegmentedControl>
        </div>
        <div className="opt-field">
          <span className="opt-label" aria-hidden="true">
            Đếm ngược khi bắt đầu
          </span>
          <SegmentedControl
            label="Đếm ngược khi bắt đầu"
            layout="fill"
            value={String(countdown)}
            onChange={(v) => setSetting("countdown", Number(v) as Settings["countdown"])}
          >
            <SegmentedControlItem value="0" label="Tắt" />
            <SegmentedControlItem value="3" label="3 giây" />
            <SegmentedControlItem value="5" label="5 giây" />
          </SegmentedControl>
        </div>

        <p className="dlg-sub">
          <Icon name="keyboard" size={14} /> Phím tắt
        </p>
        <ul className="keys">
          {SHORTCUTS.map(({ keys, label }) => (
            <li key={label}>
              <span className="keys-combo">
                {keys.map((k) => (
                  <Kbd key={k} keys={k} />
                ))}
              </span>
              <span>{label}</span>
            </li>
          ))}
        </ul>
        <p className="keys-note">Trên màn chiếu: các phím trên dùng được luôn (trừ cỡ chữ).</p>

        <div className="dlg-acts">
          <Button
            variant="secondary"
            label="Kiểm tra cập nhật"
            icon={<Icon name="refresh-cw" />}
            onClick={() => {
              onOpenChange(false);
              void updater.getState().check(true);
            }}
          />
          <Button variant="primary" label="Đóng" onClick={() => onOpenChange(false)} />
        </div>
      </div>
    </Dialog>
  );
});
