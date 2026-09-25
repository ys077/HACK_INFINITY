/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: { "on-error": "#ffffff", "outline-variant": "#c7c4d7", "surface-container-high": "#e5e6ff", "surface-bright": "#fbf8ff", "background": "#fbf8ff", "primary-container": "#5b5ce2", "on-secondary": "#ffffff", "primary-fixed": "#e1dfff", "secondary-container": "#9d9fff", "error-container": "#ffdad6", "surface-variant": "#dfe1f9", "surface": "#fbf8ff", "on-primary-container": "#f2efff", "inverse-on-surface": "#f0efff", "surface-container-lowest": "#ffffff", "tertiary": "#4f546e", "on-tertiary-fixed-variant": "#41455f", "tertiary-fixed": "#dde1ff", "on-primary-fixed-variant": "#322fba", "tertiary-fixed-dim": "#c1c5e4", "surface-tint": "#4b4bd2", "on-surface-variant": "#464554", "secondary": "#5354ae", "surface-container": "#ececff", "surface-dim": "#d7d8f0", "on-secondary-container": "#31318b", "inverse-primary": "#c1c1ff", "primary": "#4141c8", "inverse-surface": "#2c2f41", "outline": "#777586", "on-secondary-fixed-variant": "#3a3b95", "on-background": "#181a2c", "on-secondary-fixed": "#08016a", "error": "#ba1a1a", "surface-container-low": "#f4f2ff", "on-primary-fixed": "#08006b", "on-surface": "#181a2c", "on-tertiary-container": "#f0efff", "surface-container-highest": "#dfe1f9", "on-error-container": "#93000a", "on-tertiary-fixed": "#151a31", "secondary-fixed": "#e1dfff", "on-tertiary": "#ffffff", "tertiary-container": "#676c87", "on-primary": "#ffffff", "secondary-fixed-dim": "#c1c1ff", "primary-fixed-dim": "#c1c1ff" },
      borderRadius: { "DEFAULT": "0.25rem", "lg": "0.5rem", "xl": "0.75rem", "full": "9999px" },
      spacing: { "margin-mobile": "1rem", "margin": "2rem", "space-md": "1rem", "space-xl": "2rem", "space-sm": "0.5rem", "space-lg": "1.5rem", "gutter-mobile": "1rem", "gutter": "1.5rem", "space-xs": "0.25rem" },
      fontFamily: { "body-md": ["Inter"], "label-md": ["Inter"], "headline-lg-mobile": ["Inter"], "body-lg": ["Inter"], "label-sm": ["Inter"], "headline-lg": ["Inter"], "headline-md": ["Inter"], "title-md": ["Inter"], "display-mobile": ["Inter"], "display": ["Inter"], "headline-sm": ["Inter"] },
      fontSize: { "body-md": ["14px", { "lineHeight": "20px", "letterSpacing": "0em", "fontWeight": "400" }], "label-md": ["12px", { "lineHeight": "16px", "letterSpacing": "0.02em", "fontWeight": "600" }], "headline-lg-mobile": ["26px", { "lineHeight": "34px", "letterSpacing": "-0.02em", "fontWeight": "700" }], "body-lg": ["16px", { "lineHeight": "24px", "letterSpacing": "0em", "fontWeight": "400" }], "label-sm": ["11px", { "lineHeight": "14px", "letterSpacing": "0.03em", "fontWeight": "500" }], "headline-lg": ["32px", { "lineHeight": "40px", "letterSpacing": "-0.02em", "fontWeight": "700" }], "headline-md": ["24px", { "lineHeight": "32px", "letterSpacing": "-0.02em", "fontWeight": "700" }], "title-md": ["16px", { "lineHeight": "24px", "letterSpacing": "-0.01em", "fontWeight": "600" }], "display-mobile": ["36px", { "lineHeight": "44px", "letterSpacing": "-0.02em", "fontWeight": "700" }], "display": ["48px", { "lineHeight": "56px", "letterSpacing": "-0.02em", "fontWeight": "700" }], "headline-sm": ["20px", { "lineHeight": "28px", "letterSpacing": "-0.01em", "fontWeight": "600" }] }
    },
  },
  plugins: [],
}
