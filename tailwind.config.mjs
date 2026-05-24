/** @type {import('tailwindcss').Config} */
export default {
  content: ['./frontend/**/*.{html,js,jsx,ts,tsx}'],
  corePlugins: {
    preflight: false
  },
  darkMode: 'selector',
  plugins: [],
  theme: {
    borderRadius: {
      DEFAULT: '0.5625rem',
      full: '999px',
      lg: '0.8125rem',
      md: '0.6875rem',
      none: '0',
      sm: '0.375rem'
    },
    extend: {}
  }
}
