import { beforeEach, describe, expect, it } from "vitest";
import { mmss } from "../lib/format";
import { DEFAULT_SETTINGS } from "../settings";
import { useStore } from "./store";

beforeEach(() => {
  useStore.setState({ settings: DEFAULT_SETTINGS });
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
