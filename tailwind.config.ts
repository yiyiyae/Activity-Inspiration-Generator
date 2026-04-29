// Tailwind 配置：将 CSS 变量映射到颜色/字体/圆角/阴影设计令牌。
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        skin: {
          bg: "rgb(var(--color-bg) / <alpha-value>)",
          surface: "rgb(var(--color-surface) / <alpha-value>)",
          text: "rgb(var(--color-text) / <alpha-value>)",
          primary: "rgb(var(--color-primary) / <alpha-value>)",
          accent: "rgb(var(--color-accent) / <alpha-value>)",
          border: "rgb(var(--color-border) / <alpha-value>)",
        },
      },
      borderRadius: {
        card: "var(--radius-card)",
        pill: "var(--radius-pill)",
      },
      fontFamily: {
        heading: ["var(--font-heading)"],
        body: ["var(--font-body)"],
      },
      boxShadow: {
        theme: "var(--shadow-theme)",
      },
    },
  },
  plugins: [],
};

export default config;

