import { describe, expect, it } from "vitest";
import { parseScript } from "./parse";

describe("parseScript", () => {
  it("giữ một phần tử cho mỗi dòng nguồn", () => {
    expect(parseScript("a\n\nb\r\nc")).toHaveLength(4);
    expect(parseScript("")).toEqual([{ kind: "gap" }]);
  });

  it("coi dòng trống hoặc chỉ có khoảng trắng là khoảng trống", () => {
    expect(parseScript("  \t ")).toEqual([{ kind: "gap" }]);
  });

  it("nhận tiêu đề ## và bỏ các dấu thăng", () => {
    expect(parseScript("## CHÀO MỪNG")).toEqual([{ kind: "head", text: "CHÀO MỪNG" }]);
    expect(parseScript("   ###Phần 2")).toEqual([{ kind: "head", text: "Phần 2" }]);
  });

  it("không coi một dấu thăng là tiêu đề", () => {
    expect(parseScript("# ghi chú")).toEqual([
      { kind: "text", segments: [{ kind: "text", text: "# ghi chú" }] },
    ]);
  });

  it("không tách ghi chú trong dòng tiêu đề", () => {
    expect(parseScript("## Mở đầu [nhạc]")).toEqual([{ kind: "head", text: "Mở đầu [nhạc]" }]);
  });

  it("tách ghi chú [..] khỏi chữ thường, giữ cả dấu ngoặc", () => {
    expect(parseScript("Xin chào [dừng 2s] quý vị [cười]")).toEqual([
      {
        kind: "text",
        segments: [
          { kind: "text", text: "Xin chào " },
          { kind: "cue", text: "[dừng 2s]" },
          { kind: "text", text: " quý vị " },
          { kind: "cue", text: "[cười]" },
        ],
      },
    ]);
  });

  it("giữ khoảng trắng đầu dòng và ngoặc chưa đóng", () => {
    expect(parseScript("  thụt đầu [chưa đóng")).toEqual([
      { kind: "text", segments: [{ kind: "text", text: "  thụt đầu [chưa đóng" }] },
    ]);
  });

  it("không diễn giải ký tự HTML", () => {
    expect(parseScript("<b>&</b>")).toEqual([
      { kind: "text", segments: [{ kind: "text", text: "<b>&</b>" }] },
    ]);
  });
});
