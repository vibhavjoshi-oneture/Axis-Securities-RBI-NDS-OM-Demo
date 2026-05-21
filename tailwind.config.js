/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#0A2540',      // Premium deep navy for Axis branding
          slate: '#4A5568',     // Muted text and visual separation
          blue: '#2B6CB0',      // Axis accent light blue
          green: '#2F855A',     // Green for bid rates, trades, balances
          amber: '#D69E2E',     // Amber for pending alerts
          red: '#C53030',       // Red warnings
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
