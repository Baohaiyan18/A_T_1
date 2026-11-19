import { defineTheme } from "@astryxdesign/core/theme";
import { neutralTheme } from "@astryxdesign/theme-neutral/built";

/**
 * Theme theo nhận diện Rec Media (logo đỏ #be1f2c + đen):
 * - Màu nhấn (nút, hover, viền chọn, focus): đỏ thương hiệu ở chế độ Sáng, đỏ sáng hơn ở chế độ Tối
 *   để chữ trắng trên nút và chữ đỏ trên nền tối vẫn đạt tương phản >= 4.5:1.
 * - Nền và viền xám trung tính (không ngả xanh) cho hợp đỏ/đen.
 * - Màu trạng thái giữ nguyên: xanh lá (thành công), vàng (cảnh báo), coral (lỗi), cyan (thông tin).
 */
export const prompterTheme = defineTheme({
  name: "prompter",
  extends: neutralTheme,
  color: {
    accent: ["#be1f2c", "#d92b3a"],
    neutralStyle: "neutral",
  },
  tokens: {
    // Nút: chữ trắng trên đỏ (6.1:1 sáng, 4.8:1 tối). Chữ đỏ trên nền tối dùng đỏ nhạt hơn (~6:1).
    "--color-accent": ["#be1f2c", "#d92b3a"],
    "--color-on-accent": "#ffffff",
    "--color-text-accent": ["#be1f2c", "#ff6b76"],

    // Solid muted surface so card bars, tips, and setting groups remain distinct on dark panels.
    "--color-background-muted": ["#f0f0f0", "#242424"],

    // Success (logo Green #8fc84f family)
    "--color-success": ["#306c00", "#8fc84f"],
    "--color-on-success": ["#ffffff", "#0a2400"],
    "--color-success-muted": ["#dcefc6", "#1f3613"],
    "--color-on-success-muted": ["#135300", "#baf478"],
    "--color-text-success": ["#275c00", "#a9e268"],
    "--color-icon-success": ["#306c00", "#8fc84f"],

    // Warning (logo Amber #ffc337 family)
    "--color-warning": "#ffc337",
    "--color-on-warning": "#241700",
    "--color-warning-muted": ["#ffebbe", "#3e2c07"],
    "--color-on-warning-muted": ["#5c3a00", "#ffd87a"],
    "--color-text-warning": ["#704b00", "#ffd166"],
    "--color-icon-warning": ["#805700", "#ffc337"],
    "--color-border-warning": ["#b5820e", "#ffc337"],

    // Error / Destructive (logo Coral #f2664e family)
    "--color-error": ["#c43722", "#f2664e"],
    "--color-on-error": ["#ffffff", "#2b0802"],
    "--color-error-muted": ["#ffdad1", "#4b1e17"],
    "--color-on-error-muted": ["#7a1006", "#ffb3a2"],
    "--color-text-error": ["#b12c1e", "#ffb3a2"],
    "--color-icon-error": ["#b12c1e", "#f2664e"],

    // Info (logo Cyan #00b3e4 family)
    "--color-info": ["#00688a", "#00b3e4"],
    "--color-on-info": ["#ffffff", "#001e2b"],
    "--color-info-muted": ["#d1f0fa", "#0f3443"],
    "--color-on-info-muted": ["#00445c", "#8ce0fc"],
    "--color-text-info": ["#005b7a", "#62d3ff"],
    "--color-icon-info": ["#005b7a", "#62d3ff"],

    // Inset interaction rings aligned with brand & status hues
    "--shadow-inset-hover":
      "inset 0px 0px 0px 2px color-mix(in srgb, var(--color-accent) 30%, transparent)",
    "--shadow-inset-selected":
      "inset 0px 0px 0px 2px color-mix(in srgb, var(--color-accent) 50%, transparent)",
    "--shadow-inset-success":
      "inset 0px 0px 0px 2px color-mix(in srgb, var(--color-success) 30%, transparent)",
    "--shadow-inset-warning":
      "inset 0px 0px 0px 2px color-mix(in srgb, var(--color-warning) 35%, transparent)",
    "--shadow-inset-error":
      "inset 0px 0px 0px 2px color-mix(in srgb, var(--color-error) 30%, transparent)",
  },
});
