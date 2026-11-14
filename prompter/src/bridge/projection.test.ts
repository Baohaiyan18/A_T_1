import { describe, expect, it } from "vitest";
import { monitorLabel, pickMonitor } from "./projection";
import type { MonitorInfo } from "./projection";

const monitor = (index: number, primary: boolean, name = ""): MonitorInfo => ({
  key: `m${index}`,
  index,
  name,
  width: 1920,
  height: 1080,
  x: (index - 1) * 1920,
  y: 0,
  primary,
});

describe("pickMonitor", () => {
  const list = [monitor(1, true), monitor(2, false), monitor(3, false)];

  it("ưu tiên màn hình đã chọn lần trước", () => {
    expect(pickMonitor(list, "m3")?.key).toBe("m3");
    expect(pickMonitor(list, "m1")?.key).toBe("m1");
  });

  it("không còn màn đã chọn thì lấy màn phụ đầu tiên", () => {
    expect(pickMonitor(list, "đã rút")?.key).toBe("m2");
    expect(pickMonitor(list, null)?.key).toBe("m2");
  });

  it("chỉ có màn chính thì lấy màn chính", () => {
    expect(pickMonitor([monitor(1, true)], null)?.key).toBe("m1");
  });

  it("không có màn hình nào thì trả undefined", () => {
    expect(pickMonitor([], "m1")).toBeUndefined();
  });
});

describe("monitorLabel", () => {
  it("ghi số thứ tự, độ phân giải và vai trò", () => {
    expect(monitorLabel(monitor(1, true))).toBe("Màn hình 1 – 1920×1080 (chính)");
    expect(monitorLabel(monitor(2, false))).toBe("Màn hình 2 – 1920×1080 (phụ)");
  });

  it("kèm tên màn hình, bỏ tiền tố thiết bị của Windows", () => {
    expect(monitorLabel(monitor(2, false, "\\\\.\\DISPLAY2"))).toBe(
      "Màn hình 2 – 1920×1080 (phụ) · DISPLAY2",
    );
  });
});
