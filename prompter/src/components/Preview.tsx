import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent, MouseEvent, Ref } from "react";
import type { Prompter } from "../hooks/usePrompter";
import { setClassRule } from "../lib/dynamicSheet";
import type { Line } from "../script/parse";
import { useStore } from "../state/store";
import { Stage } from "./Stage";
import type { StageHandle } from "./Stage";

interface Props {
  stageRef: Ref<StageHandle>;
  lines: Line[];
  prompter: Prompter;
}

/** Khung xem trước: cùng nội dung với màn chiếu, thu nhỏ đúng tỉ lệ, không lật gương. */
export const Preview = memo(function Preview({ stageRef, lines, prompter }: Props) {
  const settings = useStore((s) => s.settings);
  const outSize = useStore((s) => s.outSize);
  const wrap = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(480);

  const scale = width / outSize.w;
  const scaleRef = useRef(scale);
  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const fit = (cw: number, ch: number) => {
      if (cw <= 0 || ch <= 0) return;
      setWidth(Math.max(1, Math.min(cw, (ch * outSize.w) / outSize.h)));
    };
    const readContentBox = () => {
      const cs = getComputedStyle(el);
      const px = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
      const py = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
      fit(el.clientWidth - px, el.clientHeight - py);
    };
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) fit(rect.width, rect.height);
      else readContentBox();
    });
    ro.observe(el);
    window.addEventListener("resize", readContentBox);
    readContentBox();
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", readContentBox);
    };
  }, [outSize]);

  useLayoutEffect(() => {
    const height = (width * outSize.h) / outSize.w;
    setClassRule(".pvbox", `width: ${width.toFixed(1)}px; height: ${height.toFixed(1)}px;`);
  }, [width, outSize.w, outSize.h]);

  // Lăn chuột để cuộn tay. Phải gắn trực tiếp vì cần `passive: false` để chặn cuộn trang.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      prompter.cmd({ action: "px", value: (e.deltaY / scaleRef.current) * 0.5 });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [prompter]);

  // Nhấp vào một điểm → đưa điểm đó lên vạch đọc.
  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const markerY = (r.height * settings.markerPos) / 100;
    prompter.cmd({
      action: "seek",
      value: prompter.pos() + (e.clientY - r.top - markerY) / scale,
    });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      e.stopPropagation();
      prompter.cmd({ action: "lines", value: -1 });
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      e.stopPropagation();
      prompter.cmd({ action: "lines", value: 1 });
    }
  };

  return (
    <div className="pvwrap" ref={wrap}>
      <div
        ref={box}
        className="pvbox"
        role="region"
        aria-label="Khung xem trước kịch bản (nhấp để nhảy dòng, lăn chuột hoặc dùng phím mũi tên để cuộn)"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={onKeyDown}
      >
        <Stage
          ref={stageRef}
          lines={lines}
          settings={settings}
          scale={scale}
          mirror={false}
          className="pvstage"
        />
      </div>
    </div>
  );
});
