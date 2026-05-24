/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Commodore 64 palette (period-correct)
        c64: {
          black:        '#000000',
          white:        '#FFFFFF',
          'dark-blue':  '#352879',
          'light-blue': '#6C5EB5',
          'border':     '#9385CC',
          red:          '#883932',
          cyan:         '#67B6BD',
        },
      },
      fontFamily: {
        c64: ['"C64", "PetMe64", monospace'],
        magazine: ['Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
