/**
 * Quản lý quy tắc CSS động theo class selector trong stylesheet trên `<head>`,
 * giúp cập nhật thông số hiển thị mà không dùng inline CSS (`style=...` hay `el.style`).
 */

const rules = new Map<string, string>();
const nodes = new Map<string, HTMLStyleElement>();

/** Gán hoặc cập nhật quy tắc CSS cho một class selector. */
export function setClassRule(selector: string, declarations: string): void {
  const css = `${selector} { ${declarations} }`;
  if (rules.get(selector) === css) return;
  rules.set(selector, css);

  if (typeof document === "undefined") return;
  let el = nodes.get(selector);
  if (!el) {
    el = document.createElement("style");
    el.dataset.ruleSelector = selector;
    document.head.appendChild(el);
    nodes.set(selector, el);
  }
  el.textContent = css;
}

/** Đọc nội dung quy tắc CSS hiện tại của một selector (dùng cho kiểm thử). */
export function getClassRule(selector: string): string | undefined {
  return rules.get(selector);
}

/** Xóa toàn bộ quy tắc CSS động đã đăng ký. */
export function clearClassRules(): void {
  rules.clear();
  for (const el of nodes.values()) {
    el.remove();
  }
  nodes.clear();
}
