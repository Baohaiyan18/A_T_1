import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Storage } from "../bridge/storage";
import { SAMPLE_SCRIPT } from "../script/parse";
import { DEFAULT_SETTINGS, sanitizeSettings } from "../settings";
import { initPersistence } from "./persist";
import { useStore } from "./store";

function memoryStorage(initial: Record<string, unknown> = {}) {
  const data = new Map(Object.entries(initial));
  const storage: Storage = {
    get: async (key) => data.get(key),
    set: async (key, value) => void data.set(key, value),
  };
  return { storage, data };
}

beforeEach(() => {
  vi.useFakeTimers();
  useStore.setState({ settings: DEFAULT_SETTINGS, text: "" });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("sanitizeSettings", () => {
  it("trả mặc định khi không có dữ liệu", () => {
    expect(sanitizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings("hỏng")).toEqual(DEFAULT_SETTINGS);
  });

  it("giữ giá trị hợp lệ kể cả font hệ thống, bổ sung trường thiếu bằng mặc định", () => {
    expect(sanitizeSettings({ speed: 22.5, mirrorH: true, font: "  Segoe UI  " })).toEqual({
      ...DEFAULT_SETTINGS,
      speed: 22.5,
      mirrorH: true,
      font: "Segoe UI",
    });
  });

  it("kẹp số ngoài khoảng và bỏ giá trị sai kiểu", () => {
    const s = sanitizeSettings({
      fontSize: 9999,
      markerPos: -5,
      speed: "nhanh",
      align: "right",
      countdown: 7,
      fg: "red",
      upper: "yes",
      font: 'Bad";Font',
    });
    expect(s).toEqual({ ...DEFAULT_SETTINGS, fontSize: 260, markerPos: 10 });
  });

  it("rơi về font mặc định khi font rỗng hoặc sai kiểu", () => {
    expect(sanitizeSettings({ font: "   " }).font).toBe(DEFAULT_SETTINGS.font);
    expect(sanitizeSettings({ font: 123 }).font).toBe(DEFAULT_SETTINGS.font);
  });
});

describe("initPersistence", () => {
  it("lần đầu dùng cài đặt mặc định và kịch bản mẫu", async () => {
    const stop = await initPersistence(memoryStorage().storage);
    expect(useStore.getState().settings).toEqual(DEFAULT_SETTINGS);
    expect(useStore.getState().text).toBe(SAMPLE_SCRIPT);
    stop();
  });

  it("nạp lại dữ liệu đã lưu, kể cả kịch bản rỗng", async () => {
    const { storage } = memoryStorage({ settings: { speed: 30 }, script: "" });
    const stop = await initPersistence(storage);
    expect(useStore.getState().settings.speed).toBe(30);
    expect(useStore.getState().text).toBe("");
    stop();
  });

  it("ghi lại khi cài đặt hoặc kịch bản thay đổi (kịch bản có debounce)", async () => {
    const { storage, data } = memoryStorage();
    const stop = await initPersistence(storage);
    expect(data.size).toBe(0);

    useStore.getState().setText("Xin");
    useStore.getState().setText("Xin chào");
    useStore.getState().setSpeed(15);
    expect(data.get("settings")).toEqual({ ...DEFAULT_SETTINGS, speed: 15 });
    expect(data.has("script")).toBe(false);

    vi.advanceTimersByTime(450);
    expect(data.get("script")).toBe("Xin chào");
    stop();
  });

  it("xả kịch bản đang chờ lưu khi dừng theo dõi", async () => {
    const { storage, data } = memoryStorage();
    const stop = await initPersistence(storage);
    useStore.getState().setText("Lưu gấp");
    expect(data.has("script")).toBe(false);
    stop();
    expect(data.get("script")).toBe("Lưu gấp");
  });

  it("không ghi khi chỉ thông tin chạy chữ thay đổi", async () => {
    const { storage, data } = memoryStorage();
    const stop = await initPersistence(storage);
    useStore.getState().setPlayback({ running: true, progress: 0.5, secondsLeft: 10 });
    expect(data.size).toBe(0);
    stop();
  });
});
