/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          deep:  "#080E1A",
          panel: "#0F1829",
          raised:"#15202F",
          hover: "#1A2A40",
        },
        border: {
          DEFAULT: "#1E3050",
          soft:    "#162540",
        },
        ink: {
          primary: "#E8EDF7",
          muted:   "#7A8EAD",
          faint:   "#485F7A",
        },
        signal: {
          cyan:   "#2FD9D2",
          amber:  "#F5A623",
          red:    "#FF5470",
          green:  "#3ADC8C",
          violet: "#8B7CF6",
          orange: "#FF8C42",
        },
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body:    ["'Inter'", "sans-serif"],
        mono:    ["'JetBrains Mono'", "monospace"],
      },
      boxShadow: {
        panel: "0 0 0 1px #1E3050, 0 8px 32px rgba(0,0,0,0.4)",
        glow:  "0 0 20px rgba(47,217,210,0.3)",
        "glow-red": "0 0 20px rgba(255,84,112,0.3)",
      },
      keyframes: {
        scan: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        blink: {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0.25 },
        },
        fadeOut: {
          "0%":   { opacity: 1, visibility: "visible" },
          "100%": { opacity: 0, visibility: "hidden" },
        },
        fadeIn: {
          "0%":   { opacity: 0, transform: "translateY(6px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(47,217,210,0)" },
          "50%":      { boxShadow: "0 0 16px 4px rgba(47,217,210,0.2)" },
        },
      },
      animation: {
        scan:       "scan 3.5s linear infinite",
        blink:      "blink 1.4s ease-in-out infinite",
        "fade-out": "fadeOut 0.5s ease-in-out forwards",
        "fade-in":  "fadeIn 0.4s ease-out forwards",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
