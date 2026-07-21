import tailwindcssPrimeui from 'tailwindcss-primeui'

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./app.vue', './app/**/*.{vue,js,ts}'],
  darkMode: false,
  plugins: [
    tailwindcssPrimeui,
    require('@tailwindcss/typography'),
  ],
}
