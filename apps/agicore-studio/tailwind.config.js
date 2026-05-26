/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Studio palette — neutral dark with one signal-colored accent
        studio: {
          accent:        '#a78bfa',   // soft violet — used for "active," "selected"
          'accent-hot':  '#8b5cf6',
          ok:            '#10b981',
          warn:          '#f59e0b',
          err:           '#ef4444',
          qc:            '#06b6d4',   // distinct cyan for Human QC nodes
        },
      },
    },
  },
  plugins: [],
};
