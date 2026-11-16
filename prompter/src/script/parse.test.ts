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

  it("tô từng màu {1}…{5} và đóng bằng {/}", () => {
    for (const n of [1, 2, 3, 4, 5] as const) {
      expect(parseScript(`a{${n}}b{/}c`)).toEqual([
        {
          kind: "text",
          segments: [
            { kind: "text", text: "a" },
            { kind: "text", text: "b", color: n },
            { kind: "text", text: "c" },
          ],
        },
      ]);
    }
  });

  it("tự đóng định dạng ở cuối dòng, không lan sang dòng sau", () => {
    expect(parseScript("{1}đỏ **đậm *nghiêng\nthường")).toEqual([
      {
        kind: "text",
        segments: [
          { kind: "text", text: "đỏ ", color: 1 },
          { kind: "text", text: "đậm ", color: 1, bold: true },
          { kind: "text", text: "nghiêng", color: 1, bold: true, italic: true },
        ],
      },
      { kind: "text", segments: [{ kind: "text", text: "thường" }] },
    ]);
  });

  it("nhận **đậm**, *nghiêng* và lồng trong màu", () => {
    expect(parseScript("**đậm** *nghiêng* {1}**a**b{/}")).toEqual([
      {
        kind: "text",
        segments: [
          { kind: "text", text: "đậm", bold: true },
          { kind: "text", text: " " },
          { kind: "text", text: "nghiêng", italic: true },
          { kind: "text", text: " " },
          { kind: "text", text: "a", color: 1, bold: true },
          { kind: "text", text: "b", color: 1 },
        ],
      },
    ]);
  });

  it("giữ nguyên {9}, {x}, {} là chữ", () => {
    expect(parseScript("{9}a{x}b{}")).toEqual([
      { kind: "text", segments: [{ kind: "text", text: "{9}a{x}b{}" }] },
    ]);
  });

  it("ghi chú [..] không nhận định dạng và không bị tách bởi dấu * bên trong", () => {
    expect(parseScript("{2}a [ghi *chú*] b{/}")).toEqual([
      {
        kind: "text",
        segments: [
          { kind: "text", text: "a ", color: 2 },
          { kind: "cue", text: "[ghi *chú*]" },
          { kind: "text", text: " b", color: 2 },
        ],
      },
    ]);
  });

  it("thẻ màu bên trong [ghi chú] không đổi màu bên ngoài", () => {
    expect(parseScript("{1}a [ghi {2}chú{/}] b{/}")).toEqual([
      {
        kind: "text",
        segments: [
          { kind: "text", text: "a ", color: 1 },
          { kind: "cue", text: "[ghi {2}chú{/}]" },
          { kind: "text", text: " b", color: 1 },
        ],
      },
    ]);
  });

  it("***a*** là vừa đậm vừa nghiêng; ** lẻ tự đóng cuối dòng", () => {
    expect(parseScript("***a*** **lẻ *n")).toEqual([
      {
        kind: "text",
        segments: [
          { kind: "text", text: "a", bold: true, italic: true },
          { kind: "text", text: " " },
          { kind: "text", text: "lẻ ", bold: true },
          { kind: "text", text: "n", bold: true, italic: true },
        ],
      },
    ]);
  });

  it("định dạng không lan qua dòng mới kiểu CRLF", () => {
    expect(parseScript("{1}a\r\nb")).toEqual([
      { kind: "text", segments: [{ kind: "text", text: "a", color: 1 }] },
      { kind: "text", segments: [{ kind: "text", text: "b" }] },
    ]);
  });

  it("dòng chỉ có thẻ định dạng là khoảng trống", () => {
    expect(parseScript("{1}{/}\n**\n {3} ")).toEqual([
      { kind: "gap" },
      { kind: "gap" },
      {
        kind: "text",
        segments: [
          { kind: "text", text: " " },
          { kind: "text", text: " ", color: 3 },
        ],
      },
    ]);
  });

  it("đổi màu giữa chừng và bỏ qua {/} thừa", () => {
    expect(parseScript("{/}a{1}b{5}c")).toEqual([
      {
        kind: "text",
        segments: [
          { kind: "text", text: "a" },
          { kind: "text", text: "b", color: 1 },
          { kind: "text", text: "c", color: 5 },
        ],
      },
    ]);
  });

  it("giữ một phần tử cho mỗi dòng nguồn khi có định dạng", () => {
    expect(parseScript("{1}a\n**b**\n\n## {2}c{/}\n*d")).toHaveLength(5);
    expect(parseScript("## {2}c{/}")).toEqual([{ kind: "head", text: "{2}c{/}" }]);
  });
});
