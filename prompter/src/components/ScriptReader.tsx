import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import { setClassRule } from "../lib/dynamicSheet";
import { parseScript } from "../script/parse";
import { useStore } from "../state/store";
import { Lines } from "./Stage";

/**
 * Bản đọc kịch bản đã định dạng (chỉ đọc), cuộn dọc bình thường. Cỡ chữ cố định theo giao diện
 * app; màu nền/chữ/ghi chú/tiêu đề/5 màu lấy từ cài đặt màn chiếu vì màu nhấn (nhất là vàng)
 * không đủ tương phản trên nền sáng của app.
 */
export function ScriptReader() {
  const text = useStore((s) => s.text);
  // Chỉ theo dõi các trường màu để đổi tốc độ/cỡ chữ không vẽ lại bản đọc.
  const s = useStore(
    useShallow(({ settings: c }) => ({
      bg: c.bg,
      fg: c.fg,
      cue: c.cue,
      head: c.head,
      c1: c.c1,
      c2: c.c2,
      c3: c.c3,
      c4: c.c4,
      c5: c.c5,
    })),
  );
  const lines = useMemo(() => parseScript(text), [text]);
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    setClassRule(
      ".reader",
      `background: ${s.bg}; color: ${s.fg}; --cue: ${s.cue}; --head: ${s.head}; --c1: ${s.c1}; --c2: ${s.c2}; --c3: ${s.c3}; --c4: ${s.c4}; --c5: ${s.c5};`,
    );
  }, [s.bg, s.fg, s.cue, s.head, s.c1, s.c2, s.c3, s.c4, s.c5]);

  // Nhận focus khi mở để Space/mũi tên điều khiển chạy chữ thay vì đổi lựa chọn MD/Preview.
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div ref={ref} className="reader" tabIndex={-1} aria-label="Bản đọc kịch bản" role="document">
      <Lines lines={lines} />
    </div>
  );
}
