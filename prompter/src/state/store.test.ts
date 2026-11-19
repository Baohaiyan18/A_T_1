import { beforeEach, describe, expect, it } from "vitest";
import { mmss } from "../lib/format";
import { DEFAULT_SETTINGS } from "../settings";
import { activeTab, newTab, useStore } from "./store";

const first = newTab("1", "A");

beforeEach(() => {
  useStore.setState({
    settings: DEFAULT_SETTINGS,
    tabs: [first],
    activeId: first.id,
  });
});

const names = () => useStore.getState().tabs.map((t) => t.name);

describe("tab kịch bản", () => {
  it("addTab thêm tab cuối với tên chưa dùng, không tự chọn", () => {
    const { addTab } = useStore.getState();
    const id = addTab();
    addTab("Mở đầu", "nội dung");
    expect(names()).toEqual(["1", "2", "Mở đầu"]);
    expect(useStore.getState().activeId).toBe(first.id);
    expect(useStore.getState().tabs[1]).toMatchObject({ id, text: "", pos: 0 });
  });

  it("addTab với tên rỗng/toàn khoảng trắng dùng tên mặc định, có tên thì cắt khoảng trắng", () => {
    const { addTab } = useStore.getState();
    addTab("   ", "x");
    addTab("  Kết  ");
    expect(names()).toEqual(["1", "2", "Kết"]);
  });

  it("tên mặc định lấp chỗ trống", () => {
    const { addTab, closeTab } = useStore.getState();
    const second = addTab();
    addTab();
    closeTab(second);
    addTab();
    expect(names()).toEqual(["1", "3", "2"]);
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

  it("moveTab đổi chỗ tab, giữ tab đang chọn", () => {
    const { addTab, moveTab } = useStore.getState();
    const b = addTab("B");
    const c = addTab("C");
    moveTab(c, 0);
    expect(useStore.getState().tabs.map((t) => t.id)).toEqual([c, first.id, b]);
    moveTab(c, 9);
    expect(useStore.getState().tabs.map((t) => t.id)).toEqual([c, first.id, b]);
    expect(useStore.getState().activeId).toBe(first.id);
  });

  it("setTabPos lưu vị trí cho đúng tab", () => {
    const { addTab, setTabPos } = useStore.getState();
    const b = addTab();
    setTabPos(b, 120);
    expect(useStore.getState().tabs.map((t) => t.pos)).toEqual([0, 120]);
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
