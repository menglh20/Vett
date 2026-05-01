import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        outfit: ["var(--font-outfit)", "sans-serif"],
      },
      colors: {
        brand: {
          teal: "#14B8BB",
          amber: "#F59E0B",
          coral: "#EF4444",
          black: "#111111",
          gray: "#888888",
        },
      },
    },
  },
  plugins: [],
};

export default config;
