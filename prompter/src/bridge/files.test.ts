import { describe, expect, it } from "vitest";
import { fileNameFor } from "./files";

describe("fileNameFor", () => {
  it("lấy tên tab làm tên file .txt", () => {
    expect(fileNameFor("Kịch bản 1")).toBe("Kịch bản 1.txt");
  });

  it("thay ký tự Windows không cho phép", () => {
    expect(fileNameFor('a/b\\c:d*e?f"g<h>i|j')).toBe("a-b-c-d-e-f-g-h-i-j.txt");
  });

  it("tên rỗng thì dùng tên mặc định", () => {
    expect(fileNameFor("   ")).toBe("kich-ban.txt");
  });
});
