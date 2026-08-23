/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          deep: "#0A0F1A",
          panel: "#111A2B",
          raised: "#17233A",
          hover: "#1D2B45",
        },
        border: {
          DEFAULT: "#233049",
          soft: "#1B2740",
        },
        ink: {
          primary: "#E7EDF7",
          muted: "#8493B0",
          faint: "#5A6B8C",
        },
        signal: {
          cyan: "#2FD9D2",
          amber: "#F5A623",
          red: "#FF5470",
          green: "#3ADC8C",
          violet: "#8B7CF6",
        },
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      boxShadow: {
        panel: "0 0 0 1px #233049, 0 8px 24px rgba(0,0,0,0.35)",
        glow: "0 0 16px rgba(47,217,210,0.35)",
      },
      keyframes: {
        scan: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        blink: {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0.35 },
        },
      },
      animation: {
        scan: "scan 3.5s linear infinite",
        blink: "blink 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
