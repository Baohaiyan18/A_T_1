import { describe, expect, it } from "vitest";
import { advanceSeamless, advanceTicker, newTicker, sanitizeTickers } from "./ticker";

describe("sanitizeTickers", () => {
  it("không phải mảng thì rỗng", () => {
    expect(sanitizeTickers(undefined)).toEqual([]);
    expect(sanitizeTickers({})).toEqual([]);
  });

  it("bỏ phần tử hỏng/trùng id, kẹp số và sửa trường sai", () => {
    const r = sanitizeTickers([
      { id: "a", text: "Tin", dir: "v", speed: 9999, loops: 2.6, fg: "red", on: false },
      { id: "a", text: "trùng" },
      null,
      { text: "không id" },
    ]);
    expect(r).toEqual([
      { ...newTicker(), id: "a", text: "Tin", dir: "v", speed: 600, loops: 3, on: false },
    ]);
  });
});

describe("advanceTicker", () => {
  it("lặp vô hạn: quay về đầu sau mỗi lượt", () => {
    const run = { off: 0, pass: 0 };
    expect(advanceTicker(run, 150, 100, 0)).toBe(false);
    expect(run).toEqual({ off: 50, pass: 1 });
  });

  it("dừng sau đủ số lượt", () => {
    const run = { off: 0, pass: 0 };
    expect(advanceTicker(run, 90, 100, 2)).toBe(false);
    expect(advanceTicker(run, 90, 100, 2)).toBe(false);
    expect(advanceTicker(run, 90, 100, 2)).toBe(true);
    expect(run).toEqual({ off: 0, pass: 2 });
    expect(advanceTicker(run, 90, 100, 2)).toBe(true);
  });
});

describe("advanceSeamless", () => {
  it("vào từ mép cuối dải rồi quay vòng theo một lần lặp", () => {
    const run = { off: 0, pass: 0 };
    advanceSeamless(run, 80, 100, 30);
    expect(run.off).toBe(80);
    advanceSeamless(run, 45, 100, 30);
    expect(run.off).toBe(125);
    advanceSeamless(run, 10, 100, 30);
    expect(run.off).toBe(105);
    advanceSeamless(run, 300, 100, 30);
    expect(run.off).toBeGreaterThanOrEqual(100);
    expect(run.off).toBeLessThan(130);
  });

  it("sanitize giữ ngăn cách hợp lệ, sai thì về mặc định", () => {
    const [a, b] = sanitizeTickers([
      { id: "a", seamless: true, sep: "★", gap: 999 },
      { id: "b", sep: "x" },
    ]);
    expect(a).toMatchObject({ seamless: true, sep: "★", gap: 200 });
    expect(b).toMatchObject({ seamless: false, sep: newTicker().sep });
  });
});
