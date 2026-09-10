/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#0F5FAF',
          dark: '#0F4C81',
          light: '#EAF5FC',
          pale: '#F4FAFE',
          bg: '#F7FAFC',
          surface: '#FFFFFF',
          border: '#DCEAF4',
          text: '#172033',
          secondary: '#5F6F82',
          muted: '#6B7785',
        },
        may10: {
          primary: '#0F5FAF',
          dark: '#0F4C81',
          bg: '#F7FAFC',
          text: '#172033',
          muted: '#6B7785',
          success: '#16A878',
          warning: '#D97706',
          danger: '#DC2626',
          50: '#F4FAFE',
          100: '#EAF5FC',
          200: '#DCEAF4',
          300: '#BCE0F7',
          400: '#96C8EB',
          500: '#0F5FAF', // May 10 Corporate Blue Primary
          600: '#0F4C81', // May 10 Corporate Blue Dark
          700: '#0A3961',
          800: '#072844',
          900: '#041829',
        },
        garco: {
          blue: '#0F5FAF',
          dark: '#0F4C81',
          bg: '#F7FAFC',
          text: '#172033',
          muted: '#6B7785',
          success: '#16A878',
          warning: '#D97706',
          danger: '#DC2626',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
