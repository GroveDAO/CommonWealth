/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          page: "#0A0A08",
          card: "#111110",
          surface: "#1F1F1C",
        },
        text: {
          primary: "#E8E6DC",
          muted: "#8A8880",
          dim: "#5A5A54",
        },
        accent: {
          green: "#C8F060",
          cyan: "#60D8C8",
          yellow: "#F0C040",
          purple: "#A080F8",
          red: "#F06080",
        },
        border: {
          DEFAULT: "#2E2E2A",
          hover: "#4A4A44",
        },
      },
      fontFamily: {
        serif: ["var(--font-dm-serif)", "serif"],
        mono: ["var(--font-dm-mono)", "monospace"],
        sans: ["var(--font-syne)", "sans-serif"],
      },
      borderRadius: {
        card: "6px",
      },
    },
  },
  plugins: [],
};
