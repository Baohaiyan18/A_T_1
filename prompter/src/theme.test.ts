import { describe, expect, it } from "vitest";
import { hexToRgb } from "./lib/color";
import { prompterTheme } from "./theme";

function parseLightDark(value: string | undefined): [string, string] {
  if (!value) throw new Error("Missing token value");
  const match = /^light-dark\(([^,]+),\s*([^)]+)\)$/.exec(value);
  if (match) return [match[1]!.trim(), match[2]!.trim()];
  return [value, value];
}

function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const toLinear = (channel: number) => {
    const s = channel / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

describe("prompterTheme", () => {
  it("uses Rec Media brand red as accent", () => {
    expect(prompterTheme.name).toBe("prompter");
    expect(parseLightDark(prompterTheme.tokens["--color-accent"])).toEqual(["#be1f2c", "#d92b3a"]);
  });

  it("keeps WCAG AA (>= 4.5:1) contrast for accent, status, and muted surface pairs", () => {
    const t = prompterTheme.tokens;
    const [surfaceL, surfaceD] = parseLightDark(t["--color-background-surface"]);
    const [bodyL, bodyD] = parseLightDark(t["--color-background-body"]);
    const [mutedL, mutedD] = parseLightDark(t["--color-background-muted"]);
    const [textL, textD] = parseLightDark(t["--color-text-primary"]);

    const checkPair = (fgToken: string, bgL: string, bgD: string) => {
      const [fgL, fgD] = parseLightDark(t[fgToken]);
      expect(contrastRatio(fgL, bgL), `${fgToken} light`).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(fgD, bgD), `${fgToken} dark`).toBeGreaterThanOrEqual(4.5);
    };

    const [onAccentL, onAccentD] = parseLightDark(t["--color-on-accent"]);
    // Nền nút đỏ với chữ trắng; chữ màu nhấn dùng token riêng để đọc được trên nền tối.
    checkPair("--color-accent", onAccentL, onAccentD);
    checkPair("--color-text-accent", surfaceL, surfaceD);
    checkPair("--color-text-accent", bodyL, bodyD);
    checkPair("--color-text-accent", mutedL, mutedD);

    const [onSuccessL, onSuccessD] = parseLightDark(t["--color-on-success"]);
    checkPair("--color-success", onSuccessL, onSuccessD);
    const [succMutedL, succMutedD] = parseLightDark(t["--color-success-muted"]);
    checkPair("--color-on-success-muted", succMutedL, succMutedD);
    checkPair("--color-text-success", surfaceL, surfaceD);

    const [onErrorL, onErrorD] = parseLightDark(t["--color-on-error"]);
    checkPair("--color-error", onErrorL, onErrorD);
    const [errMutedL, errMutedD] = parseLightDark(t["--color-error-muted"]);
    checkPair("--color-on-error-muted", errMutedL, errMutedD);
    checkPair("--color-text-error", surfaceL, surfaceD);

    const [warnMutedL, warnMutedD] = parseLightDark(t["--color-warning-muted"]);
    checkPair("--color-on-warning-muted", warnMutedL, warnMutedD);
    expect(contrastRatio(textL, warnMutedL)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(textD, warnMutedD)).toBeGreaterThanOrEqual(4.5);

    const [onInfoL, onInfoD] = parseLightDark(t["--color-on-info"]);
    checkPair("--color-info", onInfoL, onInfoD);
    const [infoMutedL, infoMutedD] = parseLightDark(t["--color-info-muted"]);
    checkPair("--color-on-info-muted", infoMutedL, infoMutedD);

    expect(contrastRatio(textL, mutedL)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(textD, mutedD)).toBeGreaterThanOrEqual(4.5);
  });
});
