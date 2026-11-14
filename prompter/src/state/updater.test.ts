import { describe, expect, it, vi } from "vitest";
import type { UpdateApi, UpdateInfo } from "../bridge/update";
import { noteVersion } from "./persist";
import { createUpdaterStore } from "./updater";

const info = (over: Partial<UpdateInfo> = {}): UpdateInfo => ({
  version: "1.1.0",
  current_version: "1.0.0",
  notes: "Sửa lỗi",
  mandatory: false,
  ...over,
});

function setup(api: Partial<UpdateApi>) {
  const full: UpdateApi = { check: async () => null, install: async () => {}, ...api };
  return createUpdaterStore(full);
}

describe("check", () => {
  it("kiểm tra tự động: có bản mới thì ghi nhận nhưng không mở hộp thoại", async () => {
    const store = setup({ check: async () => info() });
    await store.getState().check(false);
    expect(store.getState()).toMatchObject({ phase: "available", dialogOpen: false });
    expect(store.getState().info?.version).toBe("1.1.0");
  });

  it("kiểm tra thủ công: mở hộp thoại, báo đang dùng bản mới nhất", async () => {
    const store = setup({});
    await store.getState().check(true);
    expect(store.getState()).toMatchObject({ phase: "uptodate", dialogOpen: true, info: null });
  });

  it("kiểm tra thủ công lỗi thì hiện lỗi; tự động lỗi thì im lặng", async () => {
    const failing = { check: () => Promise.reject("Chưa cấu hình máy chủ cập nhật.") };
    const manual = setup(failing);
    await manual.getState().check(true);
    expect(manual.getState()).toMatchObject({
      phase: "error",
      error: "Chưa cấu hình máy chủ cập nhật.",
      dialogOpen: true,
    });

    const auto = setup(failing);
    await auto.getState().check(false);
    expect(auto.getState()).toMatchObject({ phase: "idle", dialogOpen: false, error: "" });
  });

  it("bản bắt buộc tự mở hộp thoại đúng một lần cho mỗi phiên bản", async () => {
    const store = setup({ check: async () => info({ mandatory: true }) });
    await store.getState().check(false);
    expect(store.getState().dialogOpen).toBe(true);

    store.setState({ dialogOpen: false });
    await store.getState().check(false);
    expect(store.getState().dialogOpen).toBe(false);
  });
});

describe("dismiss", () => {
  it("đóng được bản không bắt buộc và vẫn giữ thông tin bản mới", async () => {
    const store = setup({ check: async () => info() });
    await store.getState().check(true);
    store.getState().dismiss();
    expect(store.getState()).toMatchObject({ dialogOpen: false, phase: "available" });
  });

  it("không đóng được bản bắt buộc", async () => {
    const store = setup({ check: async () => info({ mandatory: true }) });
    await store.getState().check(true);
    store.getState().dismiss();
    expect(store.getState().dialogOpen).toBe(true);
  });

  it("đóng thông báo 'mới nhất' thì về trạng thái nghỉ", async () => {
    const store = setup({});
    await store.getState().check(true);
    store.getState().dismiss();
    expect(store.getState()).toMatchObject({ dialogOpen: false, phase: "idle" });
  });
});

describe("install", () => {
  it("báo tiến độ tải và không cho đóng hộp thoại khi đang tải", async () => {
    let finish = () => {};
    const store = setup({
      check: async () => info(),
      install: (onProgress) => {
        onProgress(50, 200);
        return new Promise<void>((resolve) => (finish = resolve));
      },
    });
    await store.getState().check(true);
    const done = store.getState().install();
    expect(store.getState()).toMatchObject({
      phase: "downloading",
      progress: { done: 50, total: 200 },
    });
    store.getState().dismiss();
    expect(store.getState().dialogOpen).toBe(true);
    finish();
    await done;
  });

  it("cài lỗi thì hiện lỗi và bỏ bản đã tìm thấy", async () => {
    const store = setup({
      check: async () => info(),
      install: () => Promise.reject(new Error("Chữ ký không hợp lệ")),
    });
    await store.getState().check(true);
    await store.getState().install();
    expect(store.getState()).toMatchObject({
      phase: "error",
      error: "Chữ ký không hợp lệ",
      info: null,
    });
  });

  it("không cài khi chưa có bản mới", async () => {
    const install = vi.fn(async () => {});
    const store = setup({ install });
    await store.getState().install();
    expect(install).not.toHaveBeenCalled();
  });
});

describe("noteVersion", () => {
  const memory = (initial: Record<string, unknown> = {}) => {
    const data = new Map(Object.entries(initial));
    return {
      data,
      storage: {
        get: async (k: string) => data.get(k),
        set: async (k: string, v: unknown) => void data.set(k, v),
      },
    };
  };

  it("lần chạy đầu không coi là vừa cập nhật", async () => {
    const { storage, data } = memory();
    expect(await noteVersion(storage, "1.0.0")).toBe(false);
    expect(data.get("lastVersion")).toBe("1.0.0");
  });

  it("phiên bản đổi so với lần chạy trước thì báo vừa cập nhật", async () => {
    const { storage, data } = memory({ lastVersion: "1.0.0" });
    expect(await noteVersion(storage, "1.1.0")).toBe(true);
    expect(data.get("lastVersion")).toBe("1.1.0");
    expect(await noteVersion(storage, "1.1.0")).toBe(false);
  });
});
