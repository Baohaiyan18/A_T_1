import { beforeEach, describe, expect, it } from "vitest";
import { mmss } from "../lib/format";
import { DEFAULT_SETTINGS } from "../settings";
import { activeTab, activeTimer, newTab, useStore } from "./store";

const first = newTab("Kịch bản 1", "A");

beforeEach(() => {
  useStore.setState({
    settings: DEFAULT_SETTINGS,
    tabs: [first],
    activeId: first.id,
    timers: {},
  });
});

const names = () => useStore.getState().tabs.map((t) => t.name);

describe("tab kịch bản", () => {
  it("addTab thêm tab cuối với tên chưa dùng, không tự chọn", () => {
    const { addTab } = useStore.getState();
    const id = addTab();
    addTab("Mở đầu", "nội dung");
    expect(names()).toEqual(["Kịch bản 1", "Kịch bản 2", "Mở đầu"]);
    expect(useStore.getState().activeId).toBe(first.id);
    expect(useStore.getState().tabs[1]).toMatchObject({ id, text: "", pos: 0, targetSec: 0 });
  });

  it("addTab với tên rỗng/toàn khoảng trắng dùng tên mặc định, có tên thì cắt khoảng trắng", () => {
    const { addTab } = useStore.getState();
    addTab("   ", "x");
    addTab("  Kết  ");
    expect(names()).toEqual(["Kịch bản 1", "Kịch bản 2", "Kết"]);
  });

  it("tên mặc định lấp chỗ trống", () => {
    const { addTab, closeTab } = useStore.getState();
    const second = addTab();
    addTab();
    closeTab(second);
    addTab();
    expect(names()).toEqual(["Kịch bản 1", "Kịch bản 3", "Kịch bản 2"]);
  });

  it("setText chỉ sửa tab đang chọn", () => {
    const { addTab, selectTab, setText } = useStore.getState();
    const id = addTab(undefined, "B");
    selectTab(id);
    setText("B2");
    const [a, b] = useStore.getState().tabs;
    expect([a.text, b.text]).toEqual(["A", "B2"]);
  });

  it("selectTab bỏ qua id không tồn tại", () => {
    useStore.getState().selectTab("không-có");
    expect(useStore.getState().activeId).toBe(first.id);
  });

  it("renameTab cắt khoảng trắng, bỏ qua tên rỗng", () => {
    const { renameTab } = useStore.getState();
    renameTab(first.id, "  Bản tin  ");
    renameTab(first.id, "   ");
    expect(names()).toEqual(["Bản tin"]);
  });

  it("không đóng được tab cuối cùng", () => {
    useStore.getState().closeTab(first.id);
    expect(useStore.getState().tabs).toHaveLength(1);
  });

  it("đóng tab đang chọn thì chọn tab bên phải, hết thì bên trái", () => {
    const { addTab, selectTab, closeTab } = useStore.getState();
    const b = addTab();
    const c = addTab();
    selectTab(b);
    closeTab(b);
    expect(useStore.getState().activeId).toBe(c);
    closeTab(c);
    expect(useStore.getState().activeId).toBe(first.id);
  });

  it("đóng tab khác không đổi tab đang chọn", () => {
    const b = useStore.getState().addTab();
    useStore.getState().closeTab(b);
    expect(useStore.getState().activeId).toBe(first.id);
    expect(activeTab(useStore.getState()).text).toBe("A");
  });

  it("setTabPos lưu vị trí cho đúng tab", () => {
    const { addTab, setTabPos } = useStore.getState();
    const b = addTab();
    setTabPos(b, 120);
    expect(useStore.getState().tabs.map((t) => t.pos)).toEqual([0, 120]);
  });
});

describe("đồng hồ theo tab", () => {
  it("bắt đầu, đặt lại riêng từng tab", () => {
    const { addTab, startTimer, resetTimer } = useStore.getState();
    const second = addTab();
    startTimer(first.id, 1000);
    startTimer(second, 2000);
    resetTimer(first.id);
    expect(useStore.getState().timers).toEqual({ [second]: 2000 });
  });

  it("đặt mốc giờ làm tròn xuống, không âm", () => {
    const { setTabTarget } = useStore.getState();
    setTabTarget(first.id, 90.7);
    expect(activeTab(useStore.getState()).targetSec).toBe(90);
    setTabTarget(first.id, -5);
    expect(activeTab(useStore.getState()).targetSec).toBe(0);
  });

  it("đóng tab thì bỏ đồng hồ của tab đó", () => {
    const { addTab, startTimer, closeTab } = useStore.getState();
    const second = addTab();
    startTimer(second, 1000);
    closeTab(second);
    expect(useStore.getState().timers).toEqual({});
  });

  it("activeTimer theo tab đang chọn", () => {
    const { addTab, startTimer, setTabTarget, selectTab } = useStore.getState();
    const second = addTab();
    startTimer(first.id, 1000);
    setTabTarget(second, 60);
    expect(activeTimer(useStore.getState())).toEqual({ startedAt: 1000, targetSec: 0 });
    selectTab(second);
    expect(activeTimer(useStore.getState())).toEqual({ startedAt: null, targetSec: 60 });
  });
});

describe("store", () => {
  it("setSetting chỉ đổi một trường", () => {
    useStore.getState().setSetting("upper", true);
    expect(useStore.getState().settings).toEqual({ ...DEFAULT_SETTINGS, upper: true });
  });

  it("setSpeed làm tròn về bước 0,5 và kẹp trong 0..60", () => {
    const { setSpeed } = useStore.getState();
    setSpeed(12.3);
    expect(useStore.getState().settings.speed).toBe(12.5);
    setSpeed(-4);
    expect(useStore.getState().settings.speed).toBe(0);
    setSpeed(99);
    expect(useStore.getState().settings.speed).toBe(60);
  });

  it("setFontSize kẹp trong 24..260", () => {
    const { setFontSize } = useStore.getState();
    setFontSize(10);
    expect(useStore.getState().settings.fontSize).toBe(24);
    setFontSize(500);
    expect(useStore.getState().settings.fontSize).toBe(260);
  });
});

describe("mmss", () => {
  it("định dạng phút:giây", () => {
    expect(mmss(0)).toBe("00:00");
    expect(mmss(77.4)).toBe("01:17");
    expect(mmss(600)).toBe("10:00");
    expect(mmss(-5)).toBe("00:00");
  });
});
