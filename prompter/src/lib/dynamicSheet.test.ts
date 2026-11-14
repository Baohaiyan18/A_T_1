import { beforeEach, describe, expect, it } from "vitest";
import { clearClassRules, getClassRule, setClassRule } from "./dynamicSheet";

beforeEach(() => {
  clearClassRules();
});

describe("dynamicSheet", () => {
  it("lưu và cập nhật quy tắc CSS theo selector class mà không dùng inline style", () => {
    setClassRule(".pvbox", "width: 480px; height: 270px;");
    expect(getClassRule(".pvbox")).toBe(".pvbox { width: 480px; height: 270px; }");

    setClassRule(".pvbox", "width: 640px; height: 360px;");
    expect(getClassRule(".pvbox")).toBe(".pvbox { width: 640px; height: 360px; }");
  });

  it("bỏ qua khi nội dung quy tắc không thay đổi", () => {
    setClassRule(".stage .scroller", "transform: translate3d(0, 10px, 0);");
    expect(getClassRule(".stage .scroller")).toBe(
      ".stage .scroller { transform: translate3d(0, 10px, 0); }",
    );
  });
});
