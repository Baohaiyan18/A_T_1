import { memo, useEffect, useRef } from "react";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Icon } from "./Icon";
import { SettingsPanel } from "./SettingsPanel";

export const DISPLAY_SETTINGS_ID = "display-settings";

/**
 * Ngăn cài đặt hiển thị trượt từ phải, đè lên khung xem trước (không che thanh điều khiển chạy chữ).
 * Không chặn thao tác phía sau để kéo thanh trượt vẫn thấy xem trước đổi ngay.
 */
export const DisplaySettingsDrawer = memo(function DisplaySettingsDrawer({
  onClose,
}: {
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Mở ra thì đưa focus vào ngăn để Tab dùng được ngay.
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);

  // Nghe Esc ở `window` (chạy sau cùng): popover/bộ chọn bên trong (kể cả popover của Astryx nghe ở
  // `document`) xử lý Esc trước và đánh dấu `defaultPrevented` thì không đóng ngăn.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      e.preventDefault();
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      ref={ref}
      id={DISPLAY_SETTINGS_ID}
      className="ds-drawer"
      role="dialog"
      aria-labelledby="ds-title"
      tabIndex={-1}
    >
      <div className="ds-head">
        <h3 id="ds-title">Cài đặt hiển thị</h3>
        <IconButton
          size="sm"
          variant="ghost"
          label="Đóng cài đặt hiển thị"
          tooltip="Đóng (Esc)"
          icon={<Icon name="x" size={14} />}
          onClick={onClose}
        />
      </div>
      <div className="ds-body">
        <SettingsPanel />
      </div>
    </div>
  );
});
