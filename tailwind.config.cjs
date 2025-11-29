/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './views/**/*.ejs',
    './public/**/*.html',
    './public/**/*.js'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          500: '#465fff',
          400: '#7592ff'
        }
      },
      fontFamily: {
        outfit: ['Outfit', 'ui-sans-serif', 'system-ui']
      }
    }
  },
  plugins: []
}
