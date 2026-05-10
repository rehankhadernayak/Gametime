/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Mono"', 'monospace'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      spacing: {
        'grid-20': '20px',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        typewriter: {
          '0%': { width: '0%' },
          '100%': { width: '100%' },
        },
      },
      animation: {
        blink: 'blink 1s step-end infinite',
        typewriter: 'typewriter 2.4s steps(40, end) forwards',
      },
    },
  },
  plugins: [
    function noScrollbarPlugin({ addUtilities }) {
      addUtilities({
        '.no-scrollbar::-webkit-scrollbar': {
          display: 'none',
        },
        '.no-scrollbar': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
        },
      });
    },
  ],
};
