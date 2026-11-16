import { memo, useCallback, useImperativeHandle, useLayoutEffect, useMemo, useRef } from "react";
import type { Ref, RefObject } from "react";
import { setClassRule } from "../lib/dynamicSheet";
import type { TimerView } from "../lib/timer";
import type { Line } from "../script/parse";
import type { Settings } from "../settings";
import "./Stage.css";

/** Điều khiển trực tiếp vùng hiển thị, gọi từ vòng lặp requestAnimationFrame. */
export interface StageHandle {
  /** Đặt vị trí cuộn (px màn chiếu). */
  render(pos: number): void;
  /** Hiện số đếm ngược; `seconds <= 0` thì ẩn. */
  showCount(seconds: number): void;
  /** Hiện đồng hồ góc trên-phải; `null` thì ẩn. Chỉ ghi DOM khi nội dung đổi. */
  showTimer(view: TimerView | null): void;
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
  /** Có thì đồng hồ là nút bấm (khung xem trước), gắn vào ref này. */
  timerButtonRef?: RefObject<HTMLButtonElement | null>;
  ref?: Ref<StageHandle>;
}

/** Dựng các dòng kịch bản; dùng chung cho vùng chạy chữ và bản đọc `ScriptReader`. */
export const Lines = memo(function Lines({ lines }: { lines: Line[] }) {
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
            {line.segments.map((seg, j) => {
              const cls =
                seg.kind === "cue"
                  ? "cue"
                  : [seg.color && `c${seg.color}`, seg.bold && "b", seg.italic && "i"]
                      .filter(Boolean)
                      .join(" ");
              return cls ? (
                <span key={j} className={cls}>
                  {seg.text}
                </span>
              ) : (
                seg.text
              );
            })}
          </div>
        );
      })}
      <div className="ln end">■ HẾT ■</div>
    </>
  );
});

/** Cỡ chữ đồng hồ theo chiều cao khung. */
const TIMER_FONT_RATIO = 0.06;

export function Stage({
  lines,
  settings: s,
  scale,
  mirror = true,
  className,
  timerButtonRef,
  ref,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const txtRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<HTMLElement | null>(null);
  // Hàm ref cố định để React không gỡ/gắn lại nút đồng hồ mỗi lần dựng lại.
  const setTimerEl = useCallback(
    (el: HTMLElement | null) => {
      timerRef.current = el;
      if (timerButtonRef) timerButtonRef.current = el as HTMLButtonElement | null;
    },
    [timerButtonRef],
  );
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
    lastTimer: "",
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
      showTimer(view) {
        const el = timerRef.current;
        if (!el) return;
        const m = metrics.current;
        const key = view ? `${view.state}|${view.text}|${view.elapsed}` : "";
        if (m.lastTimer === key) return;
        m.lastTimer = key;
        if (!view) {
          el.className = "timer";
          return;
        }
        el.className = `timer show ${view.state}`;
        el.textContent = view.text;
        el.title = `Đã đọc ${view.elapsed}${el instanceof HTMLButtonElement ? " · bấm để đặt mốc giờ" : ""}`;
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
      if (timerRef.current)
        timerRef.current.style.fontSize = `${(root.clientHeight * TIMER_FONT_RATIO).toFixed(1)}px`;
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
    setClassRule(
      scope,
      `background: ${s.bg}; --cue: ${s.cue}; --head: ${s.head}; --c1: ${s.c1}; --c2: ${s.c2}; --c3: ${s.c3}; --c4: ${s.c4}; --c5: ${s.c5};`,
    );
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
    s.c1,
    s.c2,
    s.c3,
    s.c4,
    s.c5,
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
        {timerButtonRef ? (
          <button type="button" className="timer" ref={setTimerEl} />
        ) : (
          <div ref={setTimerEl} className="timer" aria-hidden="true" />
        )}
      </div>
    </div>
  );
}
