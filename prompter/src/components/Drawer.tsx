import { memo, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Icon } from "./Icon";

/**
 * Ngăn trượt từ phải, đè lên khung xem trước (không che thanh điều khiển chạy chữ).
 * Không chặn thao tác phía sau để kéo thanh trượt vẫn thấy xem trước đổi ngay.
 * Esc do màn điều khiển xử lý (bật/tắt ngăn cài đặt hiển thị).
 */
export const Drawer = memo(function Drawer({
  id,
  title,
  onClose,
  children,
}: {
  id: string;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Mở ra thì đưa focus vào ngăn để Tab dùng được ngay.
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div
      ref={ref}
      id={id}
      className="ds-drawer"
      role="dialog"
      aria-labelledby={`${id}-title`}
      tabIndex={-1}
    >
      <div className="ds-head">
        <h3 id={`${id}-title`}>{title}</h3>
        <IconButton
          size="sm"
          variant="ghost"
          label={`Đóng ${title.toLowerCase()}`}
          tooltip="Đóng (Esc)"
          icon={<Icon name="x" size={14} />}
          onClick={onClose}
        />
      </div>
      <div className="ds-body">{children}</div>
    </div>
  );
});
