import { describe, expect, it } from "vitest";
import { resolveKey } from "./shortcuts";

describe("resolveKey", () => {
  it("phím cách chạy/dừng", () => {
    expect(resolveKey(" ", false)).toEqual({ type: "cmd", cmd: { action: "toggle" } });
  });

  it("mũi tên lên/xuống đổi tốc độ 1, giữ Shift thì 5", () => {
    expect(resolveKey("ArrowUp", false)).toEqual({ type: "speed", delta: 1 });
    expect(resolveKey("ArrowDown", false)).toEqual({ type: "speed", delta: -1 });
    expect(resolveKey("ArrowUp", true)).toEqual({ type: "speed", delta: 5 });
    expect(resolveKey("ArrowDown", true)).toEqual({ type: "speed", delta: -5 });
  });

  it("mũi tên trái/phải lùi/tới 1 dòng, PageUp/PageDown 3 dòng", () => {
    expect(resolveKey("ArrowLeft", false)).toEqual({
      type: "cmd",
      cmd: { action: "lines", value: -1 },
    });
    expect(resolveKey("ArrowRight", false)).toEqual({
      type: "cmd",
      cmd: { action: "lines", value: 1 },
    });
    expect(resolveKey("PageUp", false)).toEqual({
      type: "cmd",
      cmd: { action: "lines", value: -3 },
    });
    expect(resolveKey("PageDown", false)).toEqual({
      type: "cmd",
      cmd: { action: "lines", value: 3 },
    });
  });

  it("Home về đầu", () => {
    expect(resolveKey("Home", false)).toEqual({ type: "cmd", cmd: { action: "reset" } });
  });

  it("+/− đổi cỡ chữ 4 px", () => {
    expect(resolveKey("+", true)).toEqual({ type: "font", delta: 4 });
    expect(resolveKey("=", false)).toEqual({ type: "font", delta: 4 });
    expect(resolveKey("-", false)).toEqual({ type: "font", delta: -4 });
  });

  it("bỏ qua phím không được gán", () => {
    expect(resolveKey("a", false)).toBeNull();
    expect(resolveKey("Enter", false)).toBeNull();
  });
});
