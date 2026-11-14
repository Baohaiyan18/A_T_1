import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { MouseEvent, Ref } from "react";
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
export function Preview({ stageRef, lines, prompter }: Props) {
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
    const layout = () => {
      const maxH = Math.max(180, window.innerHeight * 0.42);
      setWidth(Math.max(1, Math.min(el.clientWidth, (maxH * outSize.w) / outSize.h)));
    };
    const ro = new ResizeObserver(layout);
    ro.observe(el);
    window.addEventListener("resize", layout);
    layout();
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", layout);
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

  return (
    <div className="pvwrap" ref={wrap}>
      <div ref={box} className="pvbox" onClick={onClick}>
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
}
