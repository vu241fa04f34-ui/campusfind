/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#F8F7F4',
        card: '#FFFFFF',
        primary: {
          DEFAULT: '#4776E6',
          50: '#f0f4fe',
          100: '#e0eaff',
          200: '#c7d7fe',
          300: '#a5bffd',
          400: '#7e9efb',
          500: '#4776E6',
          600: '#385ec7',
          700: '#2b47a8',
          800: '#233989',
          900: '#1e306f',
          950: '#14204d',
        },
        secondary: {
          DEFAULT: '#DDF4EE',
          50: '#f6fbf9',
          100: '#DDF4EE',
          200: '#bfebe0',
          300: '#9ee0d0',
          400: '#74d0bd',
          500: '#49bca7',
        },
        navy: {
          DEFAULT: '#202B3C',
          50: '#f4f6f8',
          100: '#e4e7eb',
          200: '#c7cbd2',
          300: '#9ea5b1',
          400: '#6f798b',
          500: '#4f596c',
          600: '#3c4556',
          700: '#2d3544',
          800: '#202B3C',
          900: '#151c27',
          950: '#0c1119',
        },
        muted: {
          DEFAULT: '#737B89',
          light: '#949ba7',
          dark: '#58606e',
        },
        borderLight: '#E8EAF0',
        brand: {
          50: '#f0f4fe',
          100: '#e0eaff',
          200: '#c7d7fe',
          300: '#a5bffd',
          400: '#7e9efb',
          500: '#4776E6',
          600: '#385ec7',
          700: '#2b47a8',
          800: '#233989',
          900: '#1e306f',
          950: '#14204d',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
