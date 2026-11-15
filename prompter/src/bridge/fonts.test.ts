import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, FONTS } from "../settings";
import { mergeFonts } from "./fonts";

describe("mergeFonts", () => {
  it("luôn giữ font mặc định, loại trùng không phân biệt hoa thường và sắp xếp", () => {
    const list = mergeFonts(["Verdana", "roboto", "Arial", "Segoe UI"], "Times New Roman");
    expect(list).toEqual(["Arial", "Roboto", "Segoe UI", "Times New Roman", "Verdana"]);
  });

  it("dùng danh sách dự phòng khi chưa có font hệ thống", () => {
    const list = mergeFonts([], "Georgia");
    for (const f of FONTS) expect(list).toContain(f);
    expect(list).toContain("Georgia");
    expect(list).toContain(DEFAULT_SETTINGS.font);
  });

  it("bỏ qua font đang chọn nếu không hợp lệ", () => {
    const list = mergeFonts(["Arial"], 'Bad"Font');
    expect(list).toEqual(["Arial", "Roboto"]);
  });
});
