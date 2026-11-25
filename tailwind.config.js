/** @type {import('tailwindcss').Config} */
module.exports = {
  // Dark mode follows the operating system (prefers-color-scheme).
  // No JavaScript toggle is needed, and the choice is automatic and
  // consistent across visits. Explicitly set for clarity.
  darkMode: "media",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bulletin: {
          // Light mode — "Buletin gereja yang tenang"
          bg: "#FAF6EC",
          card: "#FFFFFF",
          ink: "#2B2118",
          muted: "#5C5144",
          olive: "#3F5B3A",
          oliveDeep: "#33492E",
          brick: "#8A3B24",
          brickSoft: "#F9EDE7",
          line: "#DCD2BC",
          highlight: "#F6E7A8",
          gold: "#B8923A",
          badgeTint: "#E3EAD9",
          // Dark mode — warm dark, same roles
          bgDark: "#1E1A15",
          cardDark: "#2A241C",
          inkDark: "#F3EBDD",
          mutedDark: "#CFC4AE",
          oliveLight: "#A9C79F",
          brickLight: "#E8B49A",
          brickSoftDark: "#3A241B",
          lineDark: "#4A4234",
          highlightDark: "#6B5A1F",
          badgeTintDark: "#2E3A28",
        },
      },
      fontFamily: {
        serif: ["var(--font-newsreader)", "Georgia", "ui-serif", "serif"],
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      maxWidth: {
        bulletin: "45rem",
      },
    },
  },
  plugins: [],
};
