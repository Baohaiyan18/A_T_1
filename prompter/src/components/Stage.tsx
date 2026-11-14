import { memo, useImperativeHandle, useLayoutEffect, useMemo, useRef } from "react";
import type { Ref } from "react";
import { setClassRule } from "../lib/dynamicSheet";
import type { Line } from "../script/parse";
import type { Settings } from "../settings";
import "./Stage.css";

/** Điều khiển trực tiếp vùng hiển thị, gọi từ vòng lặp requestAnimationFrame. */
export interface StageHandle {
  /** Đặt vị trí cuộn (px màn chiếu). */
  render(pos: number): void;
  /** Hiện số đếm ngược; `seconds <= 0` thì ẩn. */
  showCount(seconds: number): void;
  /** Vị trí cuộn lớn nhất (px màn chiếu). */
  maxPos(): number;
  /** Vị trí cuộn đưa dòng thứ `index` lên vạch đọc (px màn chiếu). */
  lineTop(index: number): number;
}

interface Props {
  lines: Line[];
  settings: Settings;
  /** Hệ số thu nhỏ so với màn chiếu thật (màn chiếu = 1). */
  scale: number;
  /** Có áp dụng lật gương hay không (xem trước thì không). */
  mirror?: boolean;
  className?: string;
  ref?: Ref<StageHandle>;
}

const Lines = memo(function Lines({ lines }: { lines: Line[] }) {
  return (
    <>
      {lines.map((line, i) => {
        if (line.kind === "gap")
          return (
            <div key={i} className="ln">
              &nbsp;
            </div>
          );
        if (line.kind === "head")
          return (
            <div key={i} className="ln head">
              {line.text}
            </div>
          );
        return (
          <div key={i} className="ln">
            {line.segments.map((seg, j) =>
              seg.kind === "cue" ? (
                <span key={j} className="cue">
                  {seg.text}
                </span>
              ) : (
                seg.text
              ),
            )}
          </div>
        );
      })}
      <div className="ln end">■ HẾT ■</div>
    </>
  );
});

export function Stage({ lines, settings: s, scale, mirror = true, className, ref }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const txtRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLDivElement>(null);
  const posRef = useRef(0);

  const scope = className ? `.stage.${className}` : ".stage";
  const lineH = s.fontSize * scale * s.lineHeight;
  // Giữ thông số mới nhất cho các hàm gọi ngoài chu kỳ render của React.
  const geo = useRef({ lineH, scale, markerPos: s.markerPos, scope });

  const handle = useMemo<StageHandle>(() => {
    const draw = () => {
      const root = rootRef.current;
      if (!root) return;
      const g = geo.current;
      const off = (root.clientHeight * g.markerPos) / 100 - g.lineH / 2;
      setClassRule(
        `${g.scope} .scroller`,
        `transform: translate3d(0, ${(off - posRef.current * g.scale).toFixed(2)}px, 0);`,
      );
    };
    return {
      render(pos) {
        posRef.current = pos;
        draw();
      },
      showCount(seconds) {
        const el = countRef.current;
        const root = rootRef.current;
        if (!el || !root) return;
        const g = geo.current;
        if (seconds > 0) {
          setClassRule(`${g.scope} .count`, `font-size: ${(root.clientHeight * 0.45).toFixed(1)}px;`);
          el.classList.add("show");
          el.textContent = String(Math.ceil(seconds));
        } else {
          el.classList.remove("show");
        }
      },
      maxPos() {
        const txt = txtRef.current;
        if (!txt) return 0;
        const g = geo.current;
        return Math.max(0, (txt.offsetHeight - g.lineH) / g.scale);
      },
      lineTop(index) {
        const el = txtRef.current?.children[index] as HTMLElement | undefined;
        return el ? el.offsetTop / geo.current.scale : 0;
      },
    };
  }, []);

  useImperativeHandle(ref, () => handle, [handle]);

  // Cài đặt đổi thì cập nhật quy tắc CSS theo class và vẽ lại ngay, không chờ khung hình kế tiếp.
  useLayoutEffect(() => {
    geo.current = { lineH, scale, markerPos: s.markerPos, scope };
    setClassRule(scope, `background: ${s.bg}; --cue: ${s.cue}; --head: ${s.head};`);
    setClassRule(
      `${scope} .txt`,
      `font-size: ${(s.fontSize * scale).toFixed(2)}px; line-height: ${s.lineHeight}; padding: 0 ${s.margin}%; color: ${s.fg};`,
    );
    setClassRule(
      `${scope} .marker`,
      `top: ${s.markerPos}%; height: ${lineH.toFixed(2)}px; font-size: ${Math.max(8, lineH * 0.5).toFixed(2)}px;`,
    );
    handle.render(posRef.current);
  });

  const flipClass = !mirror
    ? "flip"
    : s.mirrorH && s.mirrorV
      ? "flip mirror-hv"
      : s.mirrorH
        ? "flip mirror-h"
        : s.mirrorV
          ? "flip mirror-v"
          : "flip";

  const txtClass = `txt ${s.align === "center" ? "align-center" : "align-left"}${s.upper ? " upper" : ""}`;
  const markerClass = s.marker ? "marker" : "marker hide";

  return (
    <div ref={rootRef} className={className ? `stage ${className}` : "stage"}>
      <div className={flipClass}>
        <div className="scroller">
          <div ref={txtRef} className={txtClass}>
            <Lines lines={lines} />
          </div>
        </div>
        <div className={markerClass}>
          <i />
          <i />
        </div>
        <div ref={countRef} className="count" />
      </div>
    </div>
  );
}
