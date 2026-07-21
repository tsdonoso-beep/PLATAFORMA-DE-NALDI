import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Paleta heredada del script Apps Script
        exw: "#E06666",
        carga: "#A4C2F4",
        header: "#D9E2F3",
        total: "#F4CCCC",
        fi: "#D9EAD3",
        edit: "#FFF9C4",
        tc: "#E6B8AF",
        azul: "#1A237E",
      },
    },
  },
  plugins: [],
};

export default config;
