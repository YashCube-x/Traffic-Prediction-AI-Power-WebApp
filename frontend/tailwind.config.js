/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'brand-orange': '#fc4c02',
        'brand-magenta': '#ef2cc1',
        'brand-periwinkle': '#bdbbff',
        'brand-mint': '#c8f6f9',
        'canvas-dark': '#010120',
        'surface-card': '#12182b',
        'surface-dark-soft': '#0e1222',
        'status-low': '#34d399',
        'status-moderate': '#fbbf24',
        'status-heavy': '#f97316',
        'status-severe': '#ef4444',
      }
    },
  },
  plugins: [],
}

