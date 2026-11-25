/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        shepherd: {
          50: "#fdf8f0",
          100: "#f9ecd7",
          200: "#f2d9ae",
          300: "#e8bf7d",
          400: "#dda054",
          500: "#c98a3d",
          600: "#a96f2f",
          700: "#875626",
          800: "#6e4622",
          900: "#5a3a1e",
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        serif: ["Georgia", "ui-serif", "serif"],
      },
    },
  },
  plugins: [],
};
