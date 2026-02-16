/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'kku-gold': '#ff1cecff',      // สีทอง มข.
        'kku-maroon': '#dcf500ff',    // สีแดงเลือดหมู มข.
      },
    },
  },
  plugins: [],
}