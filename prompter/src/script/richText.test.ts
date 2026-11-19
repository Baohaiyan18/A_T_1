import { describe, expect, it } from "vitest";
import { parseScript } from "./parse";
import {
  applyMark,
  lineChars,
  lineHtml,
  marksIn,
  plainLines,
  replaceRange,
  serializeLine,
} from "./richText";

const visible = (src: string) =>
  lineChars(src)
    .map((x) => x.ch)
    .join("");
const roundTrip = (src: string) => serializeLine(lineChars(src));

describe("parseScript – ký tự thoát", () => {
  it("\\*, \\{ và \\\\ là chữ thường", () => {
    expect(parseScript("5 \\* 3 \\{1} \\\\ \\x")).toEqual([
      { kind: "text", segments: [{ kind: "text", text: "5 * 3 {1} \\ \\x" }] },
    ]);
  });
});

describe("serializeLine / lineChars", () => {
  it("giữ nguyên dòng đã chuẩn", () => {
    for (const src of [
      "",
      "chữ thường",
      "{1}đỏ{/} **đậm** *nghiêng* {2}***cả hai***{/}",
      "a [ghi chú] b",
      "## TIÊU ĐỀ {1}x{/}",
    ])
      expect(roundTrip(src)).toBe(src);
  });

  it("đóng thẻ còn mở ở cuối dòng", () => {
    expect(roundTrip("{1}**a")).toBe("{1}**a**{/}");
  });

  it("thoát ký tự trùng thẻ để chữ nhìn thấy không đổi", () => {
    const chars = plainLines("5 * 3 {1} {9} \\")[0];
    const src = serializeLine(chars);
    expect(src).toBe("5 \\* 3 \\{1} {9} \\\\");
    expect(visible(src)).toBe("5 * 3 {1} {9} \\");
  });

  it("ghi chú ghi nguyên văn, định dạng hai bên vẫn giữ", () => {
    const chars = plainLines("a [g*h] b", { b: true })[0];
    const src = serializeLine(chars);
    expect(src).toBe("**a [g*h] b**");
    expect(parseScript(src)[0]).toMatchObject({
      segments: [
        { kind: "text", text: "a ", bold: true },
        { kind: "cue", text: "[g*h]" },
        { kind: "text", text: " b", bold: true },
      ],
    });
  });

  it("chữ nhìn thấy ##… thành tiêu đề, bỏ định dạng", () => {
    expect(serializeLine(plainLines("## A", { c: 1 })[0])).toBe("## A");
  });
});

describe("lineHtml", () => {
  it("dựng span theo định dạng, thoát HTML, dòng trống có <br>", () => {
    expect(lineHtml("{1}**<a>**{/} [c]")).toBe(
      '<div><span class="c1 b">&lt;a&gt;</span> <span class="cue">[c]</span></div>',
    );
    expect(lineHtml("")).toBe("<div><br></div>");
    expect(lineHtml("## T")).toBe('<div class="ln head">## T</div>');
  });
});

describe("replaceRange", () => {
  const src = ["**abc**def", "ghi"];

  it("xuống dòng giữa chữ đậm: hai dòng đều giữ định dạng", () => {
    const r = replaceRange(src, { line: 0, off: 1 }, { line: 0, off: 1 }, [[], []]);
    expect(r.src).toEqual(["**a**", "**bc**def", "ghi"]);
    expect(r.caret).toEqual({ line: 1, off: 0 });
  });

  it("xóa qua nhiều dòng thì nối hai đầu", () => {
    const r = replaceRange(src, { line: 0, off: 2 }, { line: 1, off: 1 }, [[]]);
    expect(r.src).toEqual(["**ab**hi"]);
    expect(r.caret).toEqual({ line: 0, off: 2 });
  });

  it("chèn nhiều dòng, con trỏ ở cuối đoạn chèn", () => {
    const r = replaceRange(["xy"], { line: 0, off: 1 }, { line: 0, off: 1 }, plainLines("1\n23"));
    expect(r.src).toEqual(["x1", "23y"]);
    expect(r.caret).toEqual({ line: 1, off: 2 });
  });
});

describe("applyMark / marksIn", () => {
  it("bật đậm cho cả đoạn, bấm lại thì gỡ", () => {
    const a = { line: 0, off: 0 };
    const b = { line: 0, off: 3 };
    const on = applyMark(["a**b**c"], a, b, { kind: "b" });
    expect(on).toEqual(["**abc**"]);
    expect(marksIn(on, a, b).b).toBe(true);
    expect(applyMark(on, a, b, { kind: "b" })).toEqual(["abc"]);
  });

  it("tô và gỡ màu qua nhiều dòng, bỏ qua ghi chú", () => {
    const src = ["ab [c]", "de"];
    const a = { line: 0, off: 1 };
    const b = { line: 1, off: 1 };
    const red = applyMark(src, a, b, { kind: "c", color: 1 });
    expect(red).toEqual(["a{1}b [c]{/}", "{1}d{/}e"]);
    expect(marksIn(red, a, b).c).toBe(1);
    expect(applyMark(red, a, b, { kind: "c", color: undefined })).toEqual(["ab [c]", "de"]);
  });

  it("đoạn rỗng lấy định dạng ký tự trước con trỏ", () => {
    expect(marksIn(["*a*b"], { line: 0, off: 1 }, { line: 0, off: 1 })).toEqual({
      b: false,
      i: true,
      c: undefined,
    });
  });
});
