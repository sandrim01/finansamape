import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        samape: {
          dark: "#0B1329",        // Fundo principal da página (navy ultra escuro)
          surface: "#151E34",     // Cards e painéis principais
          surfaceHover: "#1B2745",// Hover de cards/linhas
          border: "#1E2C48",      // Bordas sutis
          borderHover: "#2C3F66", // Borda em destaque
          blue: "#1D64F2",        // Azul principal dos botões (+ Nova OS)
          blueHover: "#1954CC",
          textPrimary: "#F8FAFC", // Texto claro principal
          textSecondary: "#94A3B8",// Texto cinza-azulado
          textMuted: "#64748B",   // Texto sutil / labels
        },
      },
    },
  },
  plugins: [],
};
export default config;
