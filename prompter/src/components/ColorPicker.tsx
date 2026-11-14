import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
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

function HexagonPalette({
  value,
  onPick,
}: {
  value: string;
  onPick: (hex: string) => void;
}) {
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
              onClick={() => onPick(cell.color)}
            >
              <polygon
                points={hexPoints(cell.x, cell.y, HEX_RADIUS + 0.35)}
                fill={cell.color}
              />
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
          aria-label="Dải màu xám lục giác"
        >
          {GRAY_CELLS.map((cell, i) => {
            const active = cell.color === value;
            return (
              <g key={i} className="cp-hex-cell" onClick={() => onPick(cell.color)}>
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

        <svg className="cp-preview-hex" viewBox="-22 -22 44 44" aria-label="Màu đang chọn">
          <polygon
            points={hexPoints(0, 0, 20)}
            fill={value}
            stroke="#cbd5e1"
            strokeWidth={1}
          />
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

export function ColorPicker({ id, label, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"hex" | "rgb">("hex");
  const [hsv, setHsv] = useState(() => hexToHsv(value));
  const [draft, setDraft] = useState(() => value.slice(1).toUpperCase());
  const [savedColors, setSavedColors] = useState<string[]>(loadSavedColors);

  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
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

  useLayoutEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const btn = btnRef.current;
      const pop = popRef.current;
      if (!btn || !pop) return;
      const bRect = btn.getBoundingClientRect();
      const pRect = pop.getBoundingClientRect();
      const pad = 12;

      let top = bRect.top - pRect.height - 8;
      if (top < pad) {
        top = Math.min(window.innerHeight - pRect.height - pad, bRect.bottom + 8);
      }
      top = Math.max(pad, top);

      const left = clamp(
        bRect.right - pRect.width,
        pad,
        Math.max(pad, window.innerWidth - pRect.width - pad),
      );
      setClassRule(`.${scopeClass}.cp-pop`, `top: ${top.toFixed(0)}px; left: ${left.toFixed(0)}px;`);
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, [open, scopeClass]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (popRef.current?.contains(target) || btnRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onMouseDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onMouseDown);
    };
  }, [open]);

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

  return (
    <div className={`opt ${scopeClass}`}>
      <span>{label}</span>
      <button
        ref={btnRef}
        type="button"
        className="cp-trigger"
        title={`Chọn ${label.toLowerCase()}`}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="cp-trigger-swatch" />
        <span className="cp-trigger-code">{normalizedValue.toUpperCase()}</span>
      </button>

      {open && (
        <div
          ref={popRef}
          className={`cp-pop ${scopeClass}`}
          role="dialog"
          aria-label={`Bảng chọn ${label}`}
        >
          <div className="cp-card">
            <div
              ref={svRef}
              className="cp-sv"
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
              <select
                className="cp-mode"
                value={mode}
                aria-label="Định dạng mã màu"
                onChange={(e) => setMode(e.target.value as "hex" | "rgb")}
              >
                <option value="hex">Hex</option>
                <option value="rgb">RGB</option>
              </select>

              <label className="cp-hex-box">
                {mode === "hex" && <span className="cp-hash">#</span>}
                <input
                  type="text"
                  className="cp-hex-input"
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
              <span>Saved colors:</span>
              <button type="button" className="cp-add-btn" onClick={addSavedColor}>
                + Add
              </button>
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
      )}
    </div>
  );
}
