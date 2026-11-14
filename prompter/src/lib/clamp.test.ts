import { describe, expect, it } from "vitest";
import { clamp } from "./clamp";

describe("clamp", () => {
  it("giữ nguyên giá trị nằm trong khoảng", () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it("kẹp về hai đầu khi vượt khoảng", () => {
    expect(clamp(-3, 0, 10)).toBe(0);
    expect(clamp(42, 0, 10)).toBe(10);
  });
});
