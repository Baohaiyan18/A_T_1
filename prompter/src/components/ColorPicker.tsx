import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Popover } from "@astryxdesign/core/Popover";
import { Selector } from "@astryxdesign/core/Selector";
import { clamp } from "../lib/clamp";
import {
  DEFAULT_SAVED_COLORS,
  GRAY_CELLS,
  HEXAGON_CELLS,
  HEX_RADIUS,
  formatRgb,
  hexPoints,
  hexToHsv,
  hsvToHex,
  normalizeHex,
  parseRgbInput,
} from "../lib/color";
import { setClassRule } from "../lib/dynamicSheet";
import "./ColorPicker.css";

const SAVED_COLORS_KEY = "prompter.savedColors";
const MODE_OPTIONS = [
  { value: "hex", label: "Hex" },
  { value: "rgb", label: "RGB" },
];

function loadSavedColors(): string[] {
  try {
    const raw = localStorage.getItem(SAVED_COLORS_KEY);
    if (!raw) return [...DEFAULT_SAVED_COLORS];
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const valid = parsed
        .map((c) => (typeof c === "string" ? normalizeHex(c) : null))
        .filter((c): c is string => c !== null);
      if (valid.length > 0) return valid.slice(0, 14);
    }
  } catch {
    // Bỏ qua lỗi đọc localStorage, dùng danh sách mặc định.
  }
  return [...DEFAULT_SAVED_COLORS];
}

function persistSavedColors(colors: string[]): void {
  try {
    localStorage.setItem(SAVED_COLORS_KEY, JSON.stringify(colors));
  } catch {
    // Bỏ qua nếu trình duyệt chặn lưu trữ.
  }
}

const onCellKey = (e: ReactKeyboardEvent, pick: () => void) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    pick();
  }
};

function HexagonPalette({ value, onPick }: { value: string; onPick: (hex: string) => void }) {
  return (
    <div className="cp-card cp-hex-card">
      <svg
        className="cp-hex-svg"
        viewBox="-118 -104 236 208"
        role="listbox"
        aria-label="Lưới màu lục giác"
      >
        {HEXAGON_CELLS.map((cell) => {
          const active = cell.color === value;
          return (
            <g
              key={`${cell.q},${cell.r}`}
              className="cp-hex-cell"
              role="option"
              tabIndex={0}
              aria-selected={active}
              aria-label={`Chọn màu ${cell.color.toUpperCase()}`}
              onClick={() => onPick(cell.color)}
              onKeyDown={(e) => onCellKey(e, () => onPick(cell.color))}
            >
              <polygon points={hexPoints(cell.x, cell.y, HEX_RADIUS + 0.35)} fill={cell.color} />
              {active && (
                <polygon
                  points={hexPoints(cell.x, cell.y, HEX_RADIUS * 0.68)}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth={2}
                />
              )}
            </g>
          );
        })}
      </svg>

      <div className="cp-hex-bottom">
        <svg
          className="cp-gray-svg"
          viewBox="-12 -12 138 39"
          role="listbox"
          aria-label="Dải màu xám lục giác"
        >
          {GRAY_CELLS.map((cell, i) => {
            const active = cell.color === value;
            return (
              <g
                key={i}
                className="cp-hex-cell"
                role="option"
                tabIndex={0}
                aria-selected={active}
                aria-label={`Chọn sắc xám ${cell.color.toUpperCase()}`}
                onClick={() => onPick(cell.color)}
                onKeyDown={(e) => onCellKey(e, () => onPick(cell.color))}
              >
                <polygon
                  points={hexPoints(cell.x, cell.y, HEX_RADIUS + 0.25)}
                  fill={cell.color}
                  stroke={i === 0 ? "#e2e8f0" : "none"}
                  strokeWidth={0.8}
                />
                {active && (
                  <polygon
                    points={hexPoints(cell.x, cell.y, HEX_RADIUS * 0.64)}
                    fill="none"
                    stroke={i < 6 ? "#0f172a" : "#ffffff"}
                    strokeWidth={1.8}
                  />
                )}
              </g>
            );
          })}
        </svg>

        <svg
          className="cp-preview-hex"
          viewBox="-22 -22 44 44"
          aria-label={`Màu đang chọn ${value.toUpperCase()}`}
        >
          <polygon points={hexPoints(0, 0, 20)} fill={value} stroke="#cbd5e1" strokeWidth={1} />
          <polygon
            points={hexPoints(0, 0, 15.5)}
            fill="none"
            stroke="rgba(255, 255, 255, 0.45)"
            strokeWidth={1.5}
          />
        </svg>
      </div>
    </div>
  );
}

interface Props {
  id: string;
  label: string;
  value: string;
  onChange: (hex: string) => void;
}

export const ColorPicker = memo(function ColorPicker({ id, label, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"hex" | "rgb">("hex");
  const [hsv, setHsv] = useState(() => hexToHsv(value));
  const [draft, setDraft] = useState(() => value.slice(1).toUpperCase());
  const [savedColors, setSavedColors] = useState<string[]>(loadSavedColors);

  const svRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);

  const normalizedValue = normalizeHex(value) ?? "#000000";
  const pureHueHex = hsvToHex(hsv.h, 1, 1);
  const scopeClass = `cp-scope-${id}`;

  useEffect(() => {
    const currentHex = hsvToHex(hsv.h, hsv.s, hsv.v);
    if (currentHex !== normalizedValue) {
      const next = hexToHsv(normalizedValue);
      setHsv((prev) => ({
        h: next.s === 0 ? prev.h : next.h,
        s: next.s,
        v: next.v,
      }));
    }
    setDraft(mode === "hex" ? normalizedValue.slice(1).toUpperCase() : formatRgb(normalizedValue));
  }, [normalizedValue, mode, hsv.h, hsv.s, hsv.v]);

  useLayoutEffect(() => {
    setClassRule(
      `.${scopeClass}`,
      `--cp-val: ${normalizedValue}; --cp-hue: ${pureHueHex}; --cp-sv-x: ${(hsv.s * 100).toFixed(1)}%; --cp-sv-y: ${((1 - hsv.v) * 100).toFixed(1)}%; --cp-hue-x: ${((hsv.h / 360) * 100).toFixed(1)}%;`,
    );
  }, [scopeClass, normalizedValue, pureHueHex, hsv.s, hsv.v, hsv.h]);

  const applyHsv = (nextH: number, nextS: number, nextV: number) => {
    setHsv({ h: nextH, s: nextS, v: nextV });
    onChange(hsvToHex(nextH, nextS, nextV));
  };

  const pickHex = (hex: string) => {
    const norm = normalizeHex(hex);
    if (!norm) return;
    const next = hexToHsv(norm);
    setHsv((prev) => ({
      h: next.s === 0 ? prev.h : next.h,
      s: next.s,
      v: next.v,
    }));
    onChange(norm);
  };

  const updateSvFromPointer = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = svRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    applyHsv(
      hsv.h,
      clamp((e.clientX - r.left) / r.width, 0, 1),
      clamp(1 - (e.clientY - r.top) / r.height, 0, 1),
    );
  };

  const updateHueFromPointer = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = hueRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    applyHsv(clamp(((e.clientX - r.left) / r.width) * 360, 0, 360), hsv.s, hsv.v);
  };

  const onSvKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 0.1 : 0.02;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      applyHsv(hsv.h, clamp(hsv.s - step, 0, 1), hsv.v);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      applyHsv(hsv.h, clamp(hsv.s + step, 0, 1), hsv.v);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      applyHsv(hsv.h, hsv.s, clamp(hsv.v + step, 0, 1));
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      applyHsv(hsv.h, hsv.s, clamp(hsv.v - step, 0, 1));
    }
  };

  const onHueKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 15 : 3;
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      applyHsv(clamp(hsv.h - step, 0, 360), hsv.s, hsv.v);
    } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      applyHsv(clamp(hsv.h + step, 0, 360), hsv.s, hsv.v);
    } else if (e.key === "Home") {
      e.preventDefault();
      applyHsv(0, hsv.s, hsv.v);
    } else if (e.key === "End") {
      e.preventDefault();
      applyHsv(360, hsv.s, hsv.v);
    }
  };

  const handleDraftChange = (raw: string) => {
    setDraft(raw);
    const parsed = mode === "hex" ? normalizeHex(raw) : parseRgbInput(raw);
    if (parsed && (mode === "rgb" || raw.replace(/^#/, "").trim().length === 6)) {
      pickHex(parsed);
    }
  };

  const commitDraft = () => {
    const parsed = mode === "hex" ? normalizeHex(draft) : parseRgbInput(draft);
    if (parsed) {
      pickHex(parsed);
      setDraft(mode === "hex" ? parsed.slice(1).toUpperCase() : formatRgb(parsed));
    } else {
      setDraft(
        mode === "hex" ? normalizedValue.slice(1).toUpperCase() : formatRgb(normalizedValue),
      );
    }
  };

  const addSavedColor = () => {
    const next = [
      normalizedValue,
      ...savedColors.filter((c) => c.toLowerCase() !== normalizedValue),
    ].slice(0, 14);
    setSavedColors(next);
    persistSavedColors(next);
  };

  const popoverContent = (
    <div className={`cp-pop-content ${scopeClass}`}>
      <div className="cp-card">
        <div
          ref={svRef}
          className="cp-sv"
          role="slider"
          tabIndex={0}
          aria-label="Độ bão hòa và độ sáng"
          aria-valuetext={`Bão hòa ${Math.round(hsv.s * 100)}%, độ sáng ${Math.round(hsv.v * 100)}%`}
          onKeyDown={onSvKeyDown}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            updateSvFromPointer(e);
          }}
          onPointerMove={(e) => {
            if (e.currentTarget.hasPointerCapture(e.pointerId)) updateSvFromPointer(e);
          }}
        >
          <div className="cp-sv-white" />
          <div className="cp-sv-black" />
          <div className="cp-sv-thumb" />
        </div>

        <div
          ref={hueRef}
          className="cp-hue"
          role="slider"
          tabIndex={0}
          aria-label="Sắc độ màu"
          aria-valuemin={0}
          aria-valuemax={360}
          aria-valuenow={Math.round(hsv.h)}
          onKeyDown={onHueKeyDown}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            updateHueFromPointer(e);
          }}
          onPointerMove={(e) => {
            if (e.currentTarget.hasPointerCapture(e.pointerId)) updateHueFromPointer(e);
          }}
        >
          <div className="cp-hue-thumb" />
        </div>

        <div className="cp-inputs">
          <Selector
            label="Định dạng mã màu"
            isLabelHidden
            size="md"
            width={82}
            options={MODE_OPTIONS}
            value={mode}
            onChange={(v: string | null) => {
              if (v === "hex" || v === "rgb") setMode(v);
            }}
          />

          <label className="cp-hex-box">
            {mode === "hex" && (
              <span className="cp-hash" aria-hidden="true">
                #
              </span>
            )}
            <input
              type="text"
              className="cp-hex-input"
              aria-label={mode === "hex" ? "Mã màu Hex" : "Mã màu RGB"}
              value={draft}
              spellCheck={false}
              onChange={(e) => handleDraftChange(e.target.value)}
              onBlur={commitDraft}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitDraft();
              }}
            />
          </label>
        </div>

        <div className="cp-saved-hdr">
          <span>Màu đã lưu</span>
          <Button size="sm" variant="ghost" label="+ Lưu" onClick={addSavedColor} />
        </div>

        <div className="cp-swatches">
          {savedColors.map((c, idx) => {
            const active = c.toLowerCase() === normalizedValue;
            return (
              <button
                key={`${c}-${idx}`}
                type="button"
                className={active ? "cp-swatch active" : "cp-swatch"}
                title={c.toUpperCase()}
                aria-label={`Chọn màu ${c.toUpperCase()}`}
                aria-pressed={active}
                onClick={() => pickHex(c)}
              >
                <svg viewBox="0 0 24 24" className="cp-swatch-svg" aria-hidden="true">
                  <circle cx="12" cy="12" r="12" fill={c} />
                </svg>
              </button>
            );
          })}
        </div>
      </div>

      <HexagonPalette value={normalizedValue} onPick={pickHex} />
    </div>
  );

  return (
    <div className={`opt ${scopeClass}`}>
      <span className="opt-label">{label}</span>
      <Popover
        isOpen={open}
        onOpenChange={setOpen}
        placement="above"
        alignment="end"
        padding={3}
        label={`Bảng chọn ${label}`}
        content={popoverContent}
      >
        <button
          type="button"
          className="cp-trigger"
          aria-label={`Chọn ${label.toLowerCase()}, đang chọn ${normalizedValue.toUpperCase()}`}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <span className="cp-trigger-swatch" />
          <span className="cp-trigger-code">{normalizedValue.toUpperCase()}</span>
        </button>
      </Popover>
    </div>
  );
});
