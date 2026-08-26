import type { Config } from "tailwindcss";

const warmScale = {
  50: "#FAF6EF",
  100: "#F6EFE3",                       // Primary Warm Cream Background
  200: "rgba(111, 86, 66, 0.16)",       // Walnut Border
  300: "rgba(111, 86, 66, 0.28)",
  400: "#8C715A",                       // Walnut Light
  500: "#6F5642",                       // Walnut Brown (Secondary Text)
  600: "#5C4938",
  700: "#4A433D",                       // Deep Charcoal (Body Text)
  800: "#3D3631",
  900: "#4A433D",                       // Deep Charcoal (Headings — Never pure black #000000)
  950: "#36302B",
};

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/modules/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Official ESPACIO Brand Tokens
        cream: {
          DEFAULT: "#F6EFE3", // Primary Background (Dominant)
          light: "#FAF6EF",
          dark: "#EDE4D4",
        },
        offwhite: {
          DEFAULT: "#ECF4F0", // Secondary Surface (Cards, Inputs, Panels)
          light: "#F4FAF7",
          dark: "#DFECE6",
        },
        gold: {
          DEFAULT: "#F2B455", // Primary Accent / CTA (Rare & Deliberate)
          hover: "#E0A03D",
          active: "#CD8C2A",
          soft: "#FAF0DF",
          muted: "#FCE8C8",
          dark: "#B5771A",
        },
        walnut: {
          DEFAULT: "#6F5642", // Secondary Text / Borders / Dividers
          light: "#8C715A",
          dark: "#523E2E",
          border: "rgba(111, 86, 66, 0.16)",
          soft: "rgba(111, 86, 66, 0.08)",
        },
        charcoal: {
          DEFAULT: "#4A433D", // Primary Text / Headings (Never #000000)
          light: "#625952",
          dark: "#36302B",
          muted: "#5C544D",
        },

        // Semantic Brand Scale
        brand: {
          50: "#FAF0DF",
          100: "#FCE8C8",
          200: "#F9D59B",
          300: "#F5C277",
          400: "#F3BD66",
          500: "#F2B455", // Warm Gold
          600: "#E0A03D",
          700: "#CD8C2A",
          800: "#A66D1B",
          900: "#7E5011",
        },

        // Semantic Surfaces
        surface: {
          bg: "#F6EFE3",       // Dominant App Background
          card: "#ECF4F0",     // Secondary Surface
          elevated: "#FDFBF7", // Subtle Warm Card
          muted: "#EFE6D8",    // Muted Surface
          border: "rgba(111, 86, 66, 0.16)",
        },

        // Custom Warm Scales for complete fallback protection
        slate: warmScale,
        gray: warmScale,
        zinc: warmScale,
        neutral: warmScale,
        stone: warmScale,

        // Restrained Business Semantic Colors
        semantic: {
          success: "#2E7D52",
          "success-bg": "#EAF4EE",
          "success-border": "#BCE0CA",
          warning: "#D9822B",
          "warning-bg": "#FDF5EA",
          "warning-border": "#F7D7A4",
          danger: "#C24138",
          "danger-bg": "#FDF0EE",
          "danger-border": "#F7C5C0",
          info: "#3B6978",
          "info-bg": "#EEF5F8",
          "info-border": "#C2DCE4",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      borderRadius: {
        sm: "4px",
        md: "6px",
        lg: "8px",
        xl: "10px",
      },
      boxShadow: {
        subtle: "0 1px 3px 0 rgba(111, 86, 66, 0.06), 0 1px 2px 0 rgba(111, 86, 66, 0.04)",
        card: "0 1px 3px 0 rgba(111, 86, 66, 0.08), 0 1px 2px -1px rgba(111, 86, 66, 0.06)",
        elevated: "0 4px 6px -1px rgba(111, 86, 66, 0.08), 0 2px 4px -2px rgba(111, 86, 66, 0.04)",
        modal: "0 20px 25px -5px rgba(74, 67, 61, 0.14), 0 8px 10px -6px rgba(74, 67, 61, 0.08)",
        gold: "0 2px 8px -1px rgba(242, 180, 85, 0.4)",
      },
    },
  },
  plugins: [],
};

export default config;
