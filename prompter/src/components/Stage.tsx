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
  const scrollerRef = useRef<HTMLDivElement>(null);
  const txtRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLDivElement>(null);
  const posRef = useRef(0);

  const scope = className ? `.stage.${className}` : ".stage";
  const lineH = s.fontSize * scale * s.lineHeight;
  // Giữ thông số mới nhất và bộ nhớ đệm hình học cho các hàm gọi trong requestAnimationFrame.
  const geo = useRef({ lineH, scale, markerPos: s.markerPos, scope });
  const metrics = useRef({
    rootH: 0,
    txtH: 0,
    lastY: "",
    lastCountText: "",
    countVisible: false,
  });

  const handle = useMemo<StageHandle>(() => {
    const draw = () => {
      const scroller = scrollerRef.current;
      const root = rootRef.current;
      if (!scroller || !root) return;
      const g = geo.current;
      const m = metrics.current;
      const rootH = m.rootH || root.clientHeight;
      const off = (rootH * g.markerPos) / 100 - g.lineH / 2;
      const y = (off - posRef.current * g.scale).toFixed(2);
      if (m.lastY !== y) {
        m.lastY = y;
        scroller.style.transform = `translate3d(0, ${y}px, 0)`;
      }
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
        const m = metrics.current;
        if (seconds > 0) {
          const text = String(Math.ceil(seconds));
          if (!m.countVisible) {
            m.countVisible = true;
            const rootH = m.rootH || root.clientHeight;
            el.style.fontSize = `${(rootH * 0.45).toFixed(1)}px`;
            el.classList.add("show");
          }
          if (m.lastCountText !== text) {
            m.lastCountText = text;
            el.textContent = text;
          }
        } else if (m.countVisible) {
          m.countVisible = false;
          m.lastCountText = "";
          el.classList.remove("show");
        }
      },
      maxPos() {
        const txt = txtRef.current;
        if (!txt) return 0;
        const g = geo.current;
        const txtH = metrics.current.txtH || txt.offsetHeight;
        return Math.max(0, (txtH - g.lineH) / g.scale);
      },
      lineTop(index) {
        const el = txtRef.current?.children[index] as HTMLElement | undefined;
        return el ? el.offsetTop / geo.current.scale : 0;
      },
    };
  }, []);

  useImperativeHandle(ref, () => handle, [handle]);

  // Theo dõi thay đổi kích thước khung nhìn và vùng văn bản để không phải đọc offsetHeight/clientHeight mỗi frame rAF.
  useLayoutEffect(() => {
    const root = rootRef.current;
    const txt = txtRef.current;
    if (!root || !txt) return;
    const syncMetrics = () => {
      metrics.current.rootH = root.clientHeight;
      metrics.current.txtH = txt.offsetHeight;
      metrics.current.lastY = "";
      handle.render(posRef.current);
    };
    syncMetrics();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(syncMetrics);
    ro.observe(root);
    ro.observe(txt);
    return () => ro.disconnect();
  }, [handle, lines]);

  // Cài đặt đổi thì cập nhật quy tắc CSS theo class và vẽ lại ngay, không chờ khung hình kế tiếp.
  useLayoutEffect(() => {
    geo.current = { lineH, scale, markerPos: s.markerPos, scope };
    setClassRule(scope, `background: ${s.bg}; --cue: ${s.cue}; --head: ${s.head};`);
    setClassRule(
      `${scope} .txt`,
      `font-size: ${(s.fontSize * scale).toFixed(2)}px; line-height: ${s.lineHeight}; padding: 0 ${s.margin}%; color: ${s.fg}; font-family: "${s.font}", var(--font-sans);`,
    );
    setClassRule(
      `${scope} .marker`,
      `top: ${s.markerPos}%; height: ${lineH.toFixed(2)}px; font-size: ${Math.max(8, lineH * 0.5).toFixed(2)}px;`,
    );
    if (rootRef.current && txtRef.current) {
      metrics.current.rootH = rootRef.current.clientHeight;
      metrics.current.txtH = txtRef.current.offsetHeight;
      metrics.current.lastY = "";
    }
    handle.render(posRef.current);
  }, [
    lineH,
    scale,
    s.markerPos,
    s.bg,
    s.cue,
    s.head,
    s.font,
    s.fontSize,
    s.lineHeight,
    s.margin,
    s.fg,
    scope,
    handle,
  ]);

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
        <div ref={scrollerRef} className="scroller">
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
