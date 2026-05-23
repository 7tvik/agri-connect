/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        earth: {
          50:  '#fdf8f0',
          100: '#faeeda',
          200: '#f5d9a8',
          300: '#efbf6b',
          400: '#e89a35',
          500: '#c97c1a',
          600: '#a85f12',
          700: '#8a4810',
          800: '#6e390f',
          900: '#4f280b',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};