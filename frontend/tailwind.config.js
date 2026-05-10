/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    fontFamily: {
      sans: ['"IBM Plex Mono"', 'monospace'],
      mono: ['"IBM Plex Mono"', 'monospace'],
    },
    extend: {
      spacing: {
        'grid-20': '20px',
      },
    },
  },
  plugins: [],
};
