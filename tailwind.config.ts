import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)"],
        mono: ["var(--font-geist-mono)"],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        surface: {
          DEFAULT: "#1a1d24",
          muted: "#16191f",
          raised: "#22262f",
        },
        line: {
          DEFAULT: "#2a2e38",
          soft: "#23262f",
        },
        brand: {
          DEFAULT: "#3dba8c",
          soft: "#2d9a72",
          muted: "rgba(61, 186, 140, 0.14)",
        },
      },
      boxShadow: {
        soft: "0 1px 2px rgba(0,0,0,0.2), 0 8px 24px rgba(0,0,0,0.18)",
        card: "0 1px 0 rgba(255,255,255,0.03) inset, 0 8px 28px rgba(0,0,0,0.22)",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
      },
    },
  },
  plugins: [],
};
export default config;
