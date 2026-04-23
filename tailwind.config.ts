import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0e0c15",
        panel: "#151223",
        signal: "#97f4ff",
        ember: "#ff8f5a",
        haze: "#b8b3d1",
        line: "rgba(255,255,255,0.08)",
      },
      fontFamily: {
        sans: ["var(--font-body)", "serif"],
        display: ["var(--font-display)", "serif"],
      },
      boxShadow: {
        halo: "0 0 0 1px rgba(255,255,255,0.06), 0 24px 80px rgba(5, 6, 12, 0.45)",
      },
      backgroundImage: {
        grain:
          "radial-gradient(circle at 20% 20%, rgba(151,244,255,0.18), transparent 35%), radial-gradient(circle at 80% 0%, rgba(255,143,90,0.16), transparent 28%), linear-gradient(135deg, rgba(255,255,255,0.04), transparent 30%), linear-gradient(180deg, #0f0b17 0%, #09070e 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
