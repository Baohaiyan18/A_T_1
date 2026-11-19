import { memo, useEffect, useLayoutEffect, useRef } from "react";
import type { PointerEvent } from "react";
import { clamp } from "../lib/clamp";
import { setClassRule } from "../lib/dynamicSheet";
import { advanceTicker } from "../ticker";
import type { Ticker } from "../ticker";

interface BandProps {
  t: Ticker;
  /** Hệ số thu nhỏ so với màn chiếu thật. */
  scale: number;
  /** Selector của vùng hiển thị, để quy tắc CSS của khung xem trước và màn chiếu không lẫn nhau. */
  scope: string;
  onMove?: (id: string, x: number, y: number) => void;
}

/** Một dải chữ chạy. Vị trí chữ cập nhật trực tiếp trong requestAnimationFrame, không qua React. */
const TickerBand = memo(function TickerBand({ t, scale, scope, onMove }: BandProps) {
  const band = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const live = useRef({ t, scale });
  const run = useRef({ off: 0, pass: 0 });
  const drag = useRef<{ sx: number; sy: number; x0: number; y0: number; w: number; h: number }>(
    null,
  );
  const cls = `tk-${t.id}`;
  const horiz = t.dir === "h";

  useLayoutEffect(() => {
    live.current = { t, scale };
  });

  useLayoutEffect(() => {
    setClassRule(
      `${scope} .${cls}`,
      `left: ${t.x}%; top: ${t.y}%; ${horiz ? "width" : "height"}: ${t.len}%; font-size: ${(t.fontSize * scale).toFixed(2)}px; color: ${t.fg}; background: ${t.bgOn ? t.bg : "transparent"};`,
    );
  }, [scope, cls, horiz, t.x, t.y, t.len, t.fontSize, t.fg, t.bg, t.bgOn, scale]);

  // Bật lại, bấm "Chạy lại" hoặc đổi số lượt thì chạy và đếm lượt lại từ đầu.
  useEffect(() => {
    run.current = { off: 0, pass: 0 };
  }, [t.run, t.on, t.loops]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let lastKey = "";
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const b = band.current;
      const i = inner.current;
      const { t: cur, scale: k } = live.current;
      if (b && i) {
        const h = cur.dir === "h";
        const bandLen = h ? b.clientWidth : b.clientHeight;
        const textLen = h ? i.offsetWidth : i.offsetHeight;
        const idle =
          !cur.on || advanceTicker(run.current, cur.speed * k * dt, bandLen + textLen, cur.loops);
        // Chữ đi từ mép cuối dải (phải/dưới) tới khi ra hẳn mép đầu (trái/trên).
        const p = (idle ? 0 : bandLen - run.current.off).toFixed(1);
        const key = `${idle}|${h}|${p}`;
        if (key !== lastKey) {
          lastKey = key;
          i.style.transform = h ? `translate3d(${p}px, 0, 0)` : `translate3d(0, ${p}px, 0)`;
          b.classList.toggle("idle", idle);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!onMove || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const host = e.currentTarget.parentElement?.getBoundingClientRect();
    if (!host) return;
    drag.current = {
      sx: e.clientX,
      sy: e.clientY,
      x0: t.x,
      y0: t.y,
      w: host.width,
      h: host.height,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || !onMove) return;
    onMove(
      t.id,
      clamp(Math.round(d.x0 + ((e.clientX - d.sx) / d.w) * 100), 0, 100),
      clamp(Math.round(d.y0 + ((e.clientY - d.sy) / d.h) * 100), 0, 100),
    );
  };

  const endDrag = (e: PointerEvent<HTMLDivElement>) => {
    drag.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <div
      ref={band}
      className={`tk ${cls} ${horiz ? "h" : "v"}${onMove ? " edit" : ""}`}
      title={onMove ? "Kéo để đổi vị trí chữ chạy" : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      // Không để cú nhấp rơi xuống khung xem trước (nhảy dòng).
      onClick={(e) => e.stopPropagation()}
    >
      <div ref={inner} className="tk-text">
        {horiz ? t.text.replace(/\s*\n\s*/g, "   ") : t.text}
      </div>
    </div>
  );
});

interface Props {
  tickers: Ticker[];
  scale: number;
  scope: string;
  /** Có thì dải chữ kéo được và dải đang tắt vẫn hiện mờ để đặt vị trí (khung xem trước). */
  onMove?: (id: string, x: number, y: number) => void;
}

/** Lớp chữ chạy vẽ đè lên vùng hiển thị. */
export const TickerLayer = memo(function TickerLayer({ tickers, scale, scope, onMove }: Props) {
  return (
    <div className="tickers" aria-hidden="true">
      {tickers.map(
        (t) =>
          (t.on || onMove) && (
            <TickerBand key={t.id} t={t} scale={scale} scope={scope} onMove={onMove} />
          ),
      )}
    </div>
  );
});
