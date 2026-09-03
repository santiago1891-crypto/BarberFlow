/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#D4AF37",
          dark: "#B4922A",
          soft: "rgba(212,175,55,0.12)",
        },
        secondary: "#885A2B",
        tertiary: "#2C2C2C",
        neutral: "#121212",
        card: "#17140F",
        inputbg: "#0E0C09",
        danger: {
          DEFAULT: "#C1453B",
          soft: "rgba(193,69,59,0.12)",
        },
        success: {
          DEFAULT: "#4C9A6B",
          soft: "rgba(76,154,107,0.12)",
        },
        warning: {
          DEFAULT: "#D89B3D",
          soft: "rgba(216,155,61,0.12)",
        },
      },
      fontFamily: {
        display: ['"Libre Caslon Text"', "serif"],
        sans: ['"Hanken Grotesk"', "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      keyframes: {
        "bf-shake": {
          "10%, 90%": { transform: "translateX(-1px)" },
          "20%, 80%": { transform: "translateX(2px)" },
          "30%, 50%, 70%": { transform: "translateX(-4px)" },
          "40%, 60%": { transform: "translateX(4px)" },
        },
        "bf-shimmer": {
          "0%": { backgroundPosition: "-120px 0" },
          "100%": { backgroundPosition: "220px 0" },
        },
        "bf-drop": {
          from: { opacity: 0, transform: "translateY(-6px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        "bf-rise": {
          from: { opacity: 0, transform: "translateY(10px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        "bf-fade": {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        "bf-pop": {
          from: { opacity: 0, transform: "scale(0.96) translateY(4px)" },
          to: { opacity: 1, transform: "scale(1) translateY(0)" },
        },
        "bf-pulse-dot": {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0.35 },
        },
      },
      animation: {
        "bf-shake": "bf-shake 0.48s cubic-bezier(.36,.07,.19,.97) both",
        "bf-shimmer": "bf-shimmer 2.6s ease-in-out infinite",
        "bf-drop": "bf-drop 0.22s ease-out both",
        "bf-rise": "bf-rise 0.4s ease-out both",
        "bf-fade": "bf-fade 0.15s ease-out both",
        "bf-pop": "bf-pop 0.16s ease-out both",
        "bf-pulse-dot": "bf-pulse-dot 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
