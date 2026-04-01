/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // German flag accent palette
        'de-black': '#1a1a1a',
        'de-red': '#cc0000',
        'de-gold': '#ffce00',
        // Warm dark backgrounds
        surface: {
          50:  '#fafaf9',
          100: '#f5f5f4',
          800: '#292524',
          900: '#1c1917',
          950: '#0c0a09',
        },
      },
    },
  },
  plugins: [],
}
