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
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Background surfaces
        primary:   '#0F1117',
        secondary: '#1A1D27',
        tertiary:  '#252836',
        // Accent palette
        'accent-gold':   '#D4A843',
        'accent-red':    '#C4453C',
        'accent-blue':   '#4A90D9',
        'accent-green':  '#4AD97A',
        'accent-purple': '#9B59B6',
        // Neutral shades (warm-tinted)
        warm: {
          50:  '#FAF9F6',
          100: '#F0EDE6',
          200: '#D8D4CB',
          300: '#B8B4AC',
          400: '#8B8D97',
          500: '#6B6D77',
          600: '#4E5060',
          700: '#363848',
          800: '#252836',
          900: '#1A1D27',
          950: '#0F1117',
        },
      },
    },
  },
  plugins: [],
}
