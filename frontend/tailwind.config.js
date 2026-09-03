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
      },
      animation: {
        "bf-shake": "bf-shake 0.48s cubic-bezier(.36,.07,.19,.97) both",
        "bf-shimmer": "bf-shimmer 2.6s ease-in-out infinite",
        "bf-drop": "bf-drop 0.22s ease-out both",
        "bf-rise": "bf-rise 0.4s ease-out both",
      },
    },
  },
  plugins: [],
};
