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
import { IconButton } from "@astryxdesign/core/IconButton";
import { Theme } from "@astryxdesign/core/theme";
import { AppSettingsDialog } from "../components/AppSettingsDialog";
import { DISPLAY_SETTINGS_ID, DisplaySettingsDrawer } from "../components/DisplaySettingsDrawer";
import { Footer } from "../components/Footer";
import { Icon } from "../components/Icon";
import { Preview } from "../components/Preview";
import { ProjectionBar } from "../components/ProjectionBar";
import { ScriptEditor } from "../components/ScriptEditor";
import type { StageHandle } from "../components/Stage";
import { Progress, Transport } from "../components/Transport";
import { usePrompter } from "../hooks/usePrompter";
import type { Prompter } from "../hooks/usePrompter";
import { clamp } from "../lib/clamp";
import { parseScript } from "../script/parse";
import { useActiveText } from "../state/store";
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
  const text = useActiveText();
  const deferredText = useDeferredValue(text);
  const lines = useMemo(() => parseScript(deferredText), [deferredText]);
  // Sau khi chữ đã dựng mới đặt vị trí của tab vừa chuyển sang.
  useLayoutEffect(() => prompter.linesRendered(deferredText), [prompter, deferredText]);
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

const LAYOUT_KEY = "prompter.layout";
const DEFAULT_SPLIT = { x: 44 };
const X_RANGE = { min: 24, max: 72 };

function readLayout(): { x: number } {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    if (!raw) return DEFAULT_SPLIT;
    const parsed = JSON.parse(raw) as Partial<{ x: number }>;
    return {
      x:
        typeof parsed.x === "number" && Number.isFinite(parsed.x)
          ? clamp(parsed.x, X_RANGE.min, X_RANGE.max)
          : DEFAULT_SPLIT.x,
    };
  } catch {
    return DEFAULT_SPLIT;
  }
}

function saveLayout(next: { x: number }): void {
  try {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(next));
  } catch {
    // Bỏ qua nếu localStorage không khả dụng.
  }
}

interface SplitterProps {
  containerRef: RefObject<HTMLElement | null>;
  value: number;
  defaultValue: number;
  min: number;
  max: number;
  label: string;
  onCommit: (value: number) => void;
}

/** Thanh kéo dọc chỉnh độ rộng hai khung (hỗ trợ chuột/cảm ứng, bàn phím và nhấp đúp để đặt lại). */
const Splitter = memo(function Splitter({
  containerRef,
  value,
  defaultValue,
  min,
  max,
  label,
  onCommit,
}: SplitterProps) {
  const dragRef = useRef<{ grabOffset: number; latest: number } | null>(null);

  const applyLive = useCallback(
    (pct: number) => {
      containerRef.current?.style.setProperty("--split-x", String(pct));
    },
    [containerRef],
  );

  const measurePct = (e: PointerEvent<HTMLDivElement>, grabOffset: number): number | null => {
    const host = containerRef.current;
    if (!host) return null;
    const rect = host.getBoundingClientRect();
    const cs = getComputedStyle(host);
    const padL = parseFloat(cs.paddingLeft);
    const usable = rect.width - padL - parseFloat(cs.paddingRight) - e.currentTarget.offsetWidth;
    if (usable <= 0) return null;
    return clamp(((e.clientX - grabOffset - rect.left - padL) / usable) * 100, min, max);
  };

  const finishDrag = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    const final = Math.round(dragRef.current.latest * 10) / 10;
    dragRef.current = null;
    e.currentTarget.removeAttribute("data-dragging");
    document.body.classList.remove("is-resizing-col");
    onCommit(final);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 5 : 2;
    const dec = e.key === "ArrowLeft";
    const inc = e.key === "ArrowRight";
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
      className="splitter splitter-v"
      role="separator"
      tabIndex={0}
      aria-label={label}
      aria-orientation="vertical"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
      title="Kéo để chỉnh kích cỡ · Nhấp đúp để đặt lại mặc định"
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        const r = e.currentTarget.getBoundingClientRect();
        dragRef.current = { grabOffset: e.clientX - r.left, latest: value };
        e.currentTarget.setAttribute("data-dragging", "true");
        e.currentTarget.setPointerCapture(e.pointerId);
        document.body.classList.add("is-resizing-col");
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
  const [split, setSplit] = useState(readLayout);
  const [displayOpen, setDisplayOpen] = useState(false);
  const [appOpen, setAppOpen] = useState(false);
  const gearRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    mainRef.current?.style.setProperty("--split-x", String(split.x));
  }, [split.x]);

  const commitX = useCallback((x: number) => {
    const next = { x };
    saveLayout(next);
    setSplit(next);
  }, []);

  const closeDisplay = useCallback(() => {
    setDisplayOpen(false);
    gearRef.current?.focus({ preventScroll: true });
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
          <IconButton
            label="Cài đặt"
            tooltip="Cài đặt"
            variant="ghost"
            icon={<Icon name="settings" />}
            onClick={() => setAppOpen(true)}
          />
        </header>

        <main ref={mainRef}>
          <div className="pane-left">
            <ScriptEditor prompter={prompter} />
          </div>

          <Splitter
            containerRef={mainRef}
            value={split.x}
            defaultValue={DEFAULT_SPLIT.x}
            min={X_RANGE.min}
            max={X_RANGE.max}
            label="Chỉnh độ rộng khung kịch bản và khung điều khiển"
            onCommit={commitX}
          />

          <section className="card right" aria-label="Xem trước và điều khiển">
            <div className="bar">
              <h3>Xem trước (giống màn chiếu, không lật gương)</h3>
              <span className="hint">Nhấp vào dòng để đưa lên vạch đọc · lăn chuột để cuộn</span>
              <IconButton
                ref={gearRef}
                size="sm"
                variant={displayOpen ? "secondary" : "ghost"}
                label="Cài đặt hiển thị"
                tooltip="Cài đặt hiển thị"
                aria-expanded={displayOpen}
                aria-controls={displayOpen ? DISPLAY_SETTINGS_ID : undefined}
                icon={<Icon name="settings" size={16} />}
                onClick={() => (displayOpen ? closeDisplay() : setDisplayOpen(true))}
              />
            </div>
            <div className="pv-area">
              <LivePreview stageRef={stage} prompter={prompter} />
              {displayOpen && <DisplaySettingsDrawer onClose={closeDisplay} />}
            </div>
            <Progress prompter={prompter} />
            <Transport prompter={prompter} />
          </section>
        </main>
        <Footer />
        <AppSettingsDialog isOpen={appOpen} onOpenChange={setAppOpen} />
      </div>
    </Theme>
  );
}
