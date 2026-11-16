import { describe, expect, it } from "vitest";
import { clock, parseClock, timerView } from "./timer";

const T0 = 1_000_000;
const at = (sec: number) => T0 + sec * 1000;

describe("timerView", () => {
  it("chưa bắt đầu: hiện mốc giờ, trạng thái idle", () => {
    expect(timerView(null, 300, at(99))).toEqual({
      text: "05:00",
      state: "idle",
      elapsed: "00:00",
    });
  });

  it("còn giờ: đếm ngược thời gian còn lại", () => {
    expect(timerView(T0, 10, at(3.7))).toEqual({ text: "00:07", state: "ok", elapsed: "00:03" });
  });

  it("đúng mốc: 00:00, chưa quá giờ", () => {
    expect(timerView(T0, 10, at(10))).toMatchObject({ text: "00:00", state: "ok" });
  });

  it("quá giờ: đỏ và đếm vượt", () => {
    expect(timerView(T0, 10, at(45))).toEqual({ text: "+00:35", state: "over", elapsed: "00:45" });
    expect(timerView(T0, 10, at(11))).toMatchObject({ text: "+00:01", state: "over" });
  });

  it("mốc 0: hiện thời gian đã đọc, không bao giờ quá giờ", () => {
    expect(timerView(null, 0, at(5))).toMatchObject({ text: "00:00", state: "idle" });
    expect(timerView(T0, 0, at(5000))).toEqual({
      text: "1:23:20",
      state: "ok",
      elapsed: "1:23:20",
    });
  });

  it("đồng hồ máy lùi lại thì không âm", () => {
    expect(timerView(T0, 0, at(-5)).text).toBe("00:00");
  });
});

describe("clock", () => {
  it("định dạng mm:ss và h:mm:ss", () => {
    expect(clock(0)).toBe("00:00");
    expect(clock(59.9)).toBe("00:59");
    expect(clock(3599)).toBe("59:59");
    expect(clock(3600)).toBe("1:00:00");
    expect(clock(36_000 + 65)).toBe("10:01:05");
  });
});

describe("parseClock", () => {
  it("đọc phút, phút:giây và giờ:phút:giây", () => {
    expect(parseClock("5")).toBe(300);
    expect(parseClock(" 0:10 ")).toBe(10);
    expect(parseClock("90:00")).toBe(5400);
    expect(parseClock("1:02:03")).toBe(3723);
    expect(parseClock("0")).toBe(0);
  });

  it("từ chối dữ liệu sai", () => {
    for (const bad of ["", "abc", "1:60", "1:2:3:4", "-1", "1.5", "1:", ":30", "1:00:60"])
      expect(parseClock(bad)).toBeNull();
  });
});
