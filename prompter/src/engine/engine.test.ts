import { describe, expect, it } from "vitest";
import { createEngine, runCmd, secondsLeft, speedPx, step } from "./engine";

// speed 10 × cỡ chữ 100 × 0,04 = 40 px/giây; một dòng = 150 px
const S = { speed: 10, fontSize: 100, lineHeight: 1.5, countdown: 0 as const };
const MAX = 1000;

describe("speedPx", () => {
  it("tỉ lệ với tốc độ và cỡ chữ", () => {
    expect(speedPx(S)).toBe(40);
    expect(speedPx({ speed: 10, fontSize: 50 })).toBe(20);
    expect(speedPx({ speed: 0, fontSize: 100 })).toBe(0);
  });
});

describe("step", () => {
  it("đứng yên khi chưa chạy", () => {
    const e = createEngine();
    step(e, 1, MAX, S);
    expect(e.pos).toBe(0);
  });

  it("cuộn theo tốc độ khi đang chạy", () => {
    const e = { ...createEngine(), playing: true };
    step(e, 0.5, MAX, S);
    expect(e.pos).toBe(20);
  });

  it("dừng lại ở cuối kịch bản", () => {
    const e = { pos: 990, playing: true, counting: 0 };
    step(e, 1, MAX, S);
    expect(e).toEqual({ pos: MAX, playing: false, counting: 0 });
  });

  it("đếm ngược xong thì bắt đầu chạy", () => {
    const e = { pos: 0, playing: false, counting: 0.05 };
    step(e, 0.1, MAX, S);
    expect(e.counting).toBe(0);
    expect(e.playing).toBe(true);
  });

  it("không cuộn trong lúc đếm ngược", () => {
    const e = { pos: 0, playing: false, counting: 3 };
    step(e, 1, MAX, S);
    expect(e).toEqual({ pos: 0, playing: false, counting: 2 });
  });
});

describe("runCmd", () => {
  it("toggle chạy ngay khi tắt đếm ngược", () => {
    const e = createEngine();
    runCmd(e, { action: "toggle" }, MAX, S);
    expect(e.playing).toBe(true);
    expect(e.counting).toBe(0);
  });

  it("toggle từ đầu kịch bản thì đếm ngược trước", () => {
    const e = createEngine();
    runCmd(e, { action: "toggle" }, MAX, { ...S, countdown: 3 });
    expect(e).toEqual({ pos: 0, playing: false, counting: 3 });
  });

  it("toggle giữa chừng thì không đếm ngược", () => {
    const e = { pos: 300, playing: false, counting: 0 };
    runCmd(e, { action: "toggle" }, MAX, { ...S, countdown: 3 });
    expect(e).toEqual({ pos: 300, playing: true, counting: 0 });
  });

  it("toggle khi đang ở cuối thì chạy lại từ đầu", () => {
    const e = { pos: MAX, playing: false, counting: 0 };
    runCmd(e, { action: "toggle" }, MAX, S);
    expect(e).toEqual({ pos: 0, playing: true, counting: 0 });
  });

  it("toggle khi đang đếm ngược thì hủy đếm ngược", () => {
    const e = { pos: 0, playing: false, counting: 2 };
    runCmd(e, { action: "toggle" }, MAX, { ...S, countdown: 3 });
    expect(e).toEqual({ pos: 0, playing: false, counting: 0 });
  });

  it("pause dừng chạy và giữ vị trí", () => {
    const e = { pos: 300, playing: true, counting: 0 };
    runCmd(e, { action: "pause" }, MAX, S);
    expect(e).toEqual({ pos: 300, playing: false, counting: 0 });
  });

  it("reset về đầu và dừng", () => {
    const e = { pos: 300, playing: true, counting: 0 };
    runCmd(e, { action: "reset" }, MAX, S);
    expect(e).toEqual(createEngine());
  });

  it("lines dịch theo chiều cao dòng, giữ trạng thái chạy", () => {
    const e = { pos: 300, playing: true, counting: 0 };
    runCmd(e, { action: "lines", value: 3 }, MAX, S);
    expect(e).toEqual({ pos: 750, playing: true, counting: 0 });
    runCmd(e, { action: "lines", value: -1 }, MAX, S);
    expect(e.pos).toBe(600);
  });

  it("kẹp vị trí trong khoảng [0, max]", () => {
    const e = createEngine();
    runCmd(e, { action: "seek", value: 5000 }, MAX, S);
    expect(e.pos).toBe(MAX);
    runCmd(e, { action: "px", value: -5000 }, MAX, S);
    expect(e.pos).toBe(0);
    runCmd(e, { action: "lines", value: -3 }, MAX, S);
    expect(e.pos).toBe(0);
  });
});

describe("secondsLeft", () => {
  it("bằng quãng còn lại chia tốc độ", () => {
    expect(secondsLeft({ pos: 200, playing: true, counting: 0 }, MAX, S)).toBe(20);
  });

  it("trả null khi tốc độ bằng 0", () => {
    expect(secondsLeft(createEngine(), MAX, { speed: 0, fontSize: 100 })).toBeNull();
  });
});
