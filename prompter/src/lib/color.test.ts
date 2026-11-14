import { describe, expect, it } from "vitest";
import {
  DEFAULT_SAVED_COLORS,
  GRAY_CELLS,
  HEXAGON_CELLS,
  formatRgb,
  hexToHsv,
  hexToRgb,
  hsvToHex,
  normalizeHex,
  parseRgbInput,
} from "./color";

describe("normalizeHex", () => {
  it("chuẩn hóa mã hex 6 ký tự có hoặc không có dấu #", () => {
    expect(normalizeHex("#4F46E5")).toBe("#4f46e5");
    expect(normalizeHex("4F46E5")).toBe("#4f46e5");
    expect(normalizeHex("  #00b3e4 ")).toBe("#00b3e4");
  });

  it("mở rộng mã hex 3 ký tự thành 6 ký tự", () => {
    expect(normalizeHex("#f0a")).toBe("#ff00aa");
    expect(normalizeHex("abc")).toBe("#aabbcc");
  });

  it("trả về null khi chuỗi không hợp lệ", () => {
    expect(normalizeHex("")).toBeNull();
    expect(normalizeHex("#12345")).toBeNull();
    expect(normalizeHex("#zzzzzz")).toBeNull();
  });
});

describe("hexToRgb / formatRgb / parseRgbInput", () => {
  it("chuyển đổi qua lại giữa Hex và RGB", () => {
    expect(hexToRgb("#4f46e5")).toEqual({ r: 79, g: 70, b: 229 });
    expect(formatRgb("#4f46e5")).toBe("79, 70, 229");
    expect(parseRgbInput("79, 70, 229")).toBe("#4f46e5");
    expect(parseRgbInput("255 0 128")).toBe("#ff0080");
    expect(parseRgbInput("300, -5, 0")).toBe("#ff0000");
    expect(parseRgbInput("invalid")).toBeNull();
  });
});

describe("hexToHsv & hsvToHex", () => {
  it("chuyển đổi chính xác các màu cơ bản và màu bất kỳ", () => {
    expect(hsvToHex(0, 0, 1)).toBe("#ffffff");
    expect(hsvToHex(0, 0, 0)).toBe("#000000");
    expect(hsvToHex(0, 1, 1)).toBe("#ff0000");
    expect(hsvToHex(120, 1, 1)).toBe("#00ff00");
    expect(hsvToHex(240, 1, 1)).toBe("#0000ff");

    const hsv = hexToHsv("#4f46e5");
    expect(hsvToHex(hsv.h, hsv.s, hsv.v)).toBe("#4f46e5");
  });

  it("xử lý màu xám (s = 0) không bị lỗi NaN", () => {
    const gray = hexToHsv("#808080");
    expect(gray.s).toBe(0);
    expect(gray.h).toBe(0);
    expect(hsvToHex(gray.h, gray.s, gray.v)).toBe("#808080");
  });
});

describe("HEXAGON_CELLS & GRAY_CELLS", () => {
  it("tạo đúng 127 ô lục giác cho lưới bán kính 6 với tâm màu trắng", () => {
    expect(HEXAGON_CELLS).toHaveLength(127);
    const center = HEXAGON_CELLS.find((c) => c.q === 0 && c.r === 0);
    expect(center?.color).toBe("#ffffff");
    for (const cell of HEXAGON_CELLS) {
      expect(cell.color).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("tạo dải 13 ô xám từ trắng đến đen và 14 màu lưu sẵn mặc định", () => {
    expect(GRAY_CELLS).toHaveLength(13);
    expect(GRAY_CELLS[0]?.color).toBe("#ffffff");
    expect(GRAY_CELLS[GRAY_CELLS.length - 1]?.color).toBe("#000000");
    expect(DEFAULT_SAVED_COLORS).toHaveLength(14);
  });
});
