/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#1B2A4A',
          deep: '#101A30',
          light: '#2E4170',
        },
        gold: {
          DEFAULT: '#C9A227',
          light: '#E0BC4F',
          dark: '#9C7D1A',
        },
        ivory: '#FAF7F0',
        charcoal: '#2B2B2B',
        sage: {
          DEFAULT: '#7C9885',
          light: '#A4BFAC',
        },
        clay: {
          DEFAULT: '#B85C38',
          light: '#D08362',
        },
      },
      fontFamily: {
        display: ['Fraunces', 'serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        seal: '0 2px 8px rgba(27, 42, 74, 0.25)',
      },
    },
  },
  plugins: [],
};
