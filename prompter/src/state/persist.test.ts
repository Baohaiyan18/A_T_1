import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Storage } from "../bridge/storage";
import { SAMPLE_SCRIPT } from "../script/parse";
import { DEFAULT_SETTINGS, sanitizeSettings } from "../settings";
import { initPersistence, sanitizeTabs } from "./persist";
import { activeTab, newTab, useStore } from "./store";

const text = () => activeTab(useStore.getState()).text;

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
  const tab = newTab("1");
  useStore.setState({ settings: DEFAULT_SETTINGS, tabs: [tab], activeId: tab.id });
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

  it("giữ màu nhấn c1..c5 hợp lệ, màu sai định dạng về mặc định", () => {
    const s = sanitizeSettings({ c1: "#123abc", c2: "red", c3: "#fff", c4: 5, c5: "#ABCDEF" });
    expect([s.c1, s.c2, s.c3, s.c4, s.c5]).toEqual([
      "#123abc",
      DEFAULT_SETTINGS.c2,
      DEFAULT_SETTINGS.c3,
      DEFAULT_SETTINGS.c4,
      "#ABCDEF",
    ]);
  });

  it("nạp được cài đặt cũ (v0.2.0) chưa có c1..c5", () => {
    const old = { ...DEFAULT_SETTINGS } as Record<string, unknown>;
    for (const k of ["c1", "c2", "c3", "c4", "c5"]) delete old[k];
    expect(sanitizeSettings({ ...old, speed: 12 })).toEqual({ ...DEFAULT_SETTINGS, speed: 12 });
  });

  it("rơi về font mặc định khi font rỗng hoặc sai kiểu", () => {
    expect(sanitizeSettings({ font: "   " }).font).toBe(DEFAULT_SETTINGS.font);
    expect(sanitizeSettings({ font: 123 }).font).toBe(DEFAULT_SETTINGS.font);
  });
});

describe("sanitizeTabs", () => {
  it("trả null khi không có tab hợp lệ", () => {
    expect(sanitizeTabs(undefined)).toBeNull();
    expect(sanitizeTabs({ tabs: [] })).toBeNull();
    expect(sanitizeTabs({ tabs: [{ id: "a", name: "", text: "x" }] })).toBeNull();
  });

  it("bỏ tab hỏng/trùng id, sửa pos sai, bỏ trường thừa, activeId lạ thì chọn tab đầu", () => {
    const r = sanitizeTabs({
      tabs: [
        { id: "a", name: " A ", text: "x", pos: -3, targetSec: 60 },
        { id: "a", name: "Trùng", text: "y" },
        { id: "b", name: "B", text: 5 },
        null,
        { id: "c", name: "C", text: "", pos: 10 },
      ],
      activeId: "zz",
    });
    expect(r).toEqual({
      tabs: [
        { id: "a", name: "A", text: "x", pos: 0 },
        { id: "c", name: "C", text: "", pos: 10 },
      ],
      activeId: "a",
    });
  });

  it('đổi tên mặc định cũ "Kịch bản N" thành "N", giữ tên tự đặt', () => {
    const r = sanitizeTabs({
      tabs: [
        { id: "a", name: "Kịch bản 2", text: "" },
        { id: "b", name: "Kịch bản mở đầu", text: "" },
      ],
    });
    expect(r?.tabs.map((t) => t.name)).toEqual(["2", "Kịch bản mở đầu"]);
  });
});

describe("initPersistence", () => {
  it("lần đầu dùng cài đặt mặc định và kịch bản mẫu", async () => {
    const stop = await initPersistence(memoryStorage().storage);
    expect(useStore.getState().settings).toEqual(DEFAULT_SETTINGS);
    expect(text()).toBe(SAMPLE_SCRIPT);
    expect(useStore.getState().tabs.map((t) => t.name)).toEqual(["1"]);
    stop();
  });

  it("chuyển kịch bản cũ (khóa script, kể cả rỗng) thành 1 tab, giữ khóa cũ", async () => {
    const { storage, data } = memoryStorage({ settings: { speed: 30 }, script: "" });
    const stop = await initPersistence(storage);
    expect(useStore.getState().settings.speed).toBe(30);
    expect(useStore.getState().tabs).toMatchObject([{ name: "1", text: "", pos: 0 }]);
    expect(data.get("script")).toBe("");
    stop();
  });

  it("nạp các tab đã lưu, ưu tiên hơn khóa script cũ", async () => {
    const saved = {
      tabs: [
        { id: "a", name: "Mở đầu", text: "A", pos: 50 },
        { id: "b", name: "Kết", text: "B", pos: 0 },
      ],
      activeId: "b",
    };
    const stop = await initPersistence(memoryStorage({ tabs: saved, script: "cũ" }).storage);
    expect(useStore.getState().tabs).toEqual(saved.tabs);
    expect(useStore.getState().activeId).toBe("b");
    stop();
  });

  it("dữ liệu tab hỏng thì về mặc định", async () => {
    const stop = await initPersistence(memoryStorage({ tabs: { tabs: "hỏng" } }).storage);
    expect(useStore.getState().tabs).toHaveLength(1);
    expect(text()).toBe(SAMPLE_SCRIPT);
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
    expect(data.has("tabs")).toBe(false);

    vi.advanceTimersByTime(450);
    const { tabs, activeId } = useStore.getState();
    expect(data.get("tabs")).toEqual({ tabs, activeId });
    expect(data.get("tabs")).toMatchObject({ tabs: [{ text: "Xin chào" }] });
    expect(data.has("script")).toBe(false);
    stop();
  });

  it("lưu cả khi chỉ đổi tab đang chọn, tên tab hoặc vị trí", async () => {
    const { storage, data } = memoryStorage();
    const stop = await initPersistence(storage);
    const id = useStore.getState().addTab("B");
    vi.advanceTimersByTime(450);
    data.clear();
    useStore.getState().selectTab(id);
    useStore.getState().renameTab(id, "Kết");
    useStore.getState().setTabPos(id, 80);
    vi.advanceTimersByTime(450);
    expect(data.get("tabs")).toMatchObject({ activeId: id, tabs: [{}, { name: "Kết", pos: 80 }] });
    stop();
  });

  it("xả kịch bản đang chờ lưu khi dừng theo dõi", async () => {
    const { storage, data } = memoryStorage();
    const stop = await initPersistence(storage);
    useStore.getState().setText("Lưu gấp");
    expect(data.has("tabs")).toBe(false);
    stop();
    expect(data.get("tabs")).toMatchObject({ tabs: [{ text: "Lưu gấp" }] });
  });

  it("không ghi khi chỉ thông tin chạy chữ thay đổi", async () => {
    const { storage, data } = memoryStorage();
    const stop = await initPersistence(storage);
    useStore.getState().setPlayback({ running: true, progress: 0.5, secondsLeft: 10 });
    expect(data.size).toBe(0);
    stop();
  });
});
