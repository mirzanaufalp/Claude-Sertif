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
        navy: {
          50: '#f0f4f9',
          100: '#e1e9f3',
          200: '#c3d3e7',
          300: '#94b3d7',
          400: '#5d8ec2',
          500: '#3b6ea9',
          600: '#2a548c',
          700: '#234472',
          800: '#1E3A8A', // Primary Navy Accent
          900: '#1c315e',
          950: '#0f172a',
        }
      }
    },
  },
  plugins: [],
}
