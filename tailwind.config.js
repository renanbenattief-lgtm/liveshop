/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#140D26', 900: '#0F0A1E', 800: '#1C1433', 700: '#261C42', 600: '#352A57', 500: '#4A3E70' },
        mist: { DEFAULT: '#EDE9F7', 300: '#C9C1E0', 400: '#A79DC4', 500: '#8478A6' },
        onair: { DEFAULT: '#FF2E63', 600: '#E01A50' },
        tag: { DEFAULT: '#FFD23F', 600: '#F2BE0F' },
        cool: '#3DDCC2',
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        sans: ['Figtree', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        pulsedot: { '0%,100%': { opacity: '1', transform: 'scale(1)' }, '50%': { opacity: '.45', transform: 'scale(.8)' } },
        scan: { '0%': { transform: 'translateY(-100%)' }, '100%': { transform: 'translateY(100%)' } },
      },
      animation: { pulsedot: 'pulsedot 1.4s ease-in-out infinite', scan: 'scan 6s linear infinite' },
    },
  },
  plugins: [],
}
