import "@astryxdesign/core/reset.css";
import "@astryxdesign/core/astryx.css";
import {
  memo,
  useCallback,
  useDeferredValue,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { KeyboardEvent, PointerEvent, RefObject } from "react";
import { Collapsible } from "@astryxdesign/core/Collapsible";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Kbd } from "@astryxdesign/core/Kbd";
import { Theme } from "@astryxdesign/core/theme";
import { Footer } from "../components/Footer";
import { Icon } from "../components/Icon";
import { Preview } from "../components/Preview";
import { ProjectionBar } from "../components/ProjectionBar";
import { ScriptEditor } from "../components/ScriptEditor";
import { SettingsPanel } from "../components/SettingsPanel";
import type { StageHandle } from "../components/Stage";
import { Progress, Transport } from "../components/Transport";
import { usePrompter } from "../hooks/usePrompter";
import type { Prompter } from "../hooks/usePrompter";
import { clamp } from "../lib/clamp";
import { parseScript } from "../script/parse";
import { useStore } from "../state/store";
import { useThemeMode } from "../state/themeMode";
import { prompterTheme } from "../theme";
import "./ControlWindow.css";

/** Xem trước tự theo dõi kịch bản; phân tích chạy ở mức ưu tiên thấp để gõ phím không bị khựng. */
const LivePreview = memo(function LivePreview({
  stageRef,
  prompter,
}: {
  stageRef: RefObject<StageHandle | null>;
  prompter: Prompter;
}) {
  const text = useStore((s) => s.text);
  const deferredText = useDeferredValue(text);
  const lines = useMemo(() => parseScript(deferredText), [deferredText]);
  return <Preview stageRef={stageRef} lines={lines} prompter={prompter} />;
});

const ThemeToggle = memo(function ThemeToggle() {
  const mode = useThemeMode((s) => s.mode);
  const toggle = useThemeMode((s) => s.toggle);
  const label = mode === "dark" ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối";
  return (
    <IconButton
      label={label}
      tooltip={label}
      variant="ghost"
      icon={<Icon name={mode === "dark" ? "sun" : "moon"} />}
      onClick={toggle}
    />
  );
});

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

const ShortcutHelp = memo(function ShortcutHelp() {
  return (
    <Collapsible
      defaultIsOpen={false}
      trigger={
        <span className="section-title">
          <Icon name="keyboard" /> Phím tắt
        </span>
      }
    >
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
    </Collapsible>
  );
});

const LAYOUT_KEY = "prompter.layout";
const DEFAULT_SPLIT = { x: 44, y: 52 };
const X_RANGE = { min: 24, max: 72 };
const Y_RANGE = { min: 26, max: 76 };

function readLayout(): { x: number; y: number } {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    if (!raw) return DEFAULT_SPLIT;
    const parsed = JSON.parse(raw) as Partial<{ x: number; y: number }>;
    return {
      x:
        typeof parsed.x === "number" && Number.isFinite(parsed.x)
          ? clamp(parsed.x, X_RANGE.min, X_RANGE.max)
          : DEFAULT_SPLIT.x,
      y:
        typeof parsed.y === "number" && Number.isFinite(parsed.y)
          ? clamp(parsed.y, Y_RANGE.min, Y_RANGE.max)
          : DEFAULT_SPLIT.y,
    };
  } catch {
    return DEFAULT_SPLIT;
  }
}

function saveLayout(next: { x: number; y: number }): void {
  try {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(next));
  } catch {
    // Bỏ qua nếu localStorage không khả dụng.
  }
}

interface SplitterProps {
  axis: "vertical" | "horizontal";
  containerRef: RefObject<HTMLElement | null>;
  cssVar: "--split-x" | "--split-y";
  value: number;
  defaultValue: number;
  min: number;
  max: number;
  label: string;
  onCommit: (value: number) => void;
}

/** Thanh kéo thay đổi tỉ lệ hai khung kề nhau (hỗ trợ chuột/cảm ứng, bàn phím và nhấp đúp để đặt lại). */
const Splitter = memo(function Splitter({
  axis,
  containerRef,
  cssVar,
  value,
  defaultValue,
  min,
  max,
  label,
  onCommit,
}: SplitterProps) {
  const dragRef = useRef<{ grabOffset: number; latest: number } | null>(null);
  const isVertical = axis === "vertical";

  const applyLive = useCallback(
    (pct: number) => {
      containerRef.current?.style.setProperty(cssVar, String(pct));
    },
    [containerRef, cssVar],
  );

  const measurePct = (e: PointerEvent<HTMLDivElement>, grabOffset: number): number | null => {
    const host = containerRef.current;
    if (!host) return null;
    const rect = host.getBoundingClientRect();
    const cs = getComputedStyle(host);
    const handleSize = isVertical ? e.currentTarget.offsetWidth : e.currentTarget.offsetHeight;
    if (isVertical) {
      const padL = parseFloat(cs.paddingLeft);
      const usable = rect.width - padL - parseFloat(cs.paddingRight) - handleSize;
      if (usable <= 0) return null;
      return clamp(((e.clientX - grabOffset - rect.left - padL) / usable) * 100, min, max);
    }
    const padT = parseFloat(cs.paddingTop);
    const usable = rect.height - padT - parseFloat(cs.paddingBottom) - handleSize;
    if (usable <= 0) return null;
    return clamp(((e.clientY - grabOffset - rect.top - padT) / usable) * 100, min, max);
  };

  const finishDrag = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    const final = Math.round(dragRef.current.latest * 10) / 10;
    dragRef.current = null;
    e.currentTarget.removeAttribute("data-dragging");
    document.body.classList.remove("is-resizing-col", "is-resizing-row");
    onCommit(final);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 5 : 2;
    const dec = isVertical ? e.key === "ArrowLeft" : e.key === "ArrowUp";
    const inc = isVertical ? e.key === "ArrowRight" : e.key === "ArrowDown";
    if (dec || inc) {
      e.preventDefault();
      e.stopPropagation();
      const next = clamp(value + (inc ? step : -step), min, max);
      applyLive(next);
      onCommit(next);
    } else if (e.key === "Home") {
      e.preventDefault();
      e.stopPropagation();
      applyLive(defaultValue);
      onCommit(defaultValue);
    }
  };

  return (
    <div
      className={isVertical ? "splitter splitter-v" : "splitter splitter-h"}
      role="separator"
      tabIndex={0}
      aria-label={label}
      aria-orientation={axis}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
      title="Kéo để chỉnh kích cỡ · Nhấp đúp để đặt lại mặc định"
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        const r = e.currentTarget.getBoundingClientRect();
        const grabOffset = isVertical ? e.clientX - r.left : e.clientY - r.top;
        dragRef.current = { grabOffset, latest: value };
        e.currentTarget.setAttribute("data-dragging", "true");
        e.currentTarget.setPointerCapture(e.pointerId);
        document.body.classList.add(isVertical ? "is-resizing-col" : "is-resizing-row");
      }}
      onPointerMove={(e) => {
        const drag = dragRef.current;
        if (!drag) return;
        const pct = measurePct(e, drag.grabOffset);
        if (pct === null) return;
        drag.latest = pct;
        applyLive(pct);
        e.currentTarget.setAttribute("aria-valuenow", String(Math.round(pct)));
      }}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
      onDoubleClick={() => {
        applyLive(defaultValue);
        onCommit(defaultValue);
      }}
      onKeyDown={onKeyDown}
    />
  );
});

/** Màn điều khiển: soạn kịch bản, xem trước, điều khiển chạy chữ và cài đặt hiển thị. */
export function ControlWindow() {
  const mode = useThemeMode((s) => s.mode);
  const stage = useRef<StageHandle>(null);
  const prompter = usePrompter(stage);
  const mainRef = useRef<HTMLElement>(null);
  const rightRef = useRef<HTMLElement>(null);
  const [split, setSplit] = useState(readLayout);

  useLayoutEffect(() => {
    mainRef.current?.style.setProperty("--split-x", String(split.x));
  }, [split.x]);

  useLayoutEffect(() => {
    rightRef.current?.style.setProperty("--split-y", String(split.y));
  }, [split.y]);

  const commitX = useCallback((x: number) => {
    setSplit((prev) => {
      const next = { ...prev, x };
      saveLayout(next);
      return next;
    });
  }, []);

  const commitY = useCallback((y: number) => {
    setSplit((prev) => {
      const next = { ...prev, y };
      saveLayout(next);
      return next;
    });
  }, []);

  return (
    <Theme theme={prompterTheme} mode={mode}>
      <div className="ctl">
        <header>
          <div className="brand">
            <img className="brand-logo" src="/logo.png" alt="" />
            <div className="brand-text">
              Prompter
              <small>Phần mềm máy nhắc chữ</small>
            </div>
          </div>
          <ProjectionBar />
          <ThemeToggle />
        </header>

        <main ref={mainRef}>
          <div className="pane-left">
            <ScriptEditor prompter={prompter} />
          </div>

          <Splitter
            axis="vertical"
            containerRef={mainRef}
            cssVar="--split-x"
            value={split.x}
            defaultValue={DEFAULT_SPLIT.x}
            min={X_RANGE.min}
            max={X_RANGE.max}
            label="Chỉnh độ rộng khung kịch bản và khung điều khiển"
            onCommit={commitX}
          />

          <section ref={rightRef} className="card right" aria-label="Xem trước và điều khiển">
            <div className="right-top">
              <div className="bar">
                <h3>Xem trước (giống màn chiếu, không lật gương)</h3>
                <span className="hint">Nhấp vào dòng để đưa lên vạch đọc · lăn chuột để cuộn</span>
              </div>
              <LivePreview stageRef={stage} prompter={prompter} />
              <Progress prompter={prompter} />
              <Transport prompter={prompter} />
            </div>

            <Splitter
              axis="horizontal"
              containerRef={rightRef}
              cssVar="--split-y"
              value={split.y}
              defaultValue={DEFAULT_SPLIT.y}
              min={Y_RANGE.min}
              max={Y_RANGE.max}
              label="Chỉnh chiều cao khung xem trước và bảng cài đặt"
              onCommit={commitY}
            />

            <div className="right-scroll">
              <Collapsible
                trigger={<span className="section-title">Cài đặt hiển thị</span>}
                defaultIsOpen
              >
                <SettingsPanel />
              </Collapsible>
              <ShortcutHelp />
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </Theme>
  );
}
