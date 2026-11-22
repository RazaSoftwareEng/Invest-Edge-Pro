/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        maroon: {
          50: '#fdf2f4',
          100: '#f9e1e6',
          200: '#f0bfc9',
          300: '#e08fa1',
          400: '#c4506a',
          500: '#a82545',
          600: '#8a1230',
          700: '#6e0d26',
          800: '#55091c',
          900: '#3d0010',
          950: '#260009',
        },
        gold: {
          100: '#fbf0dc',
          200: '#f6dcae',
          300: '#efcf9b',
          400: '#e8c088',
          500: '#d6a35f',
          600: '#b98544',
          700: '#8f6431',
        },
        cream: {
          50: '#fffaf0',
          100: '#fbeedb',
        },
      },
      fontFamily: {
        sans: ['Poppins', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      boxShadow: {
        card: '0 18px 40px -18px rgba(38, 0, 9, 0.75), 0 2px 10px -2px rgba(232, 192, 136, 0.35)',
        gold: '0 0 0 2px #e8c088, 0 10px 22px -8px rgba(232, 192, 136, 0.65)',
      },
      keyframes: {
        pop: {
          '0%': { opacity: '0', transform: 'translateY(12px) scale(.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        fade: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        pop: 'pop .22s ease-out',
        fade: 'fade .3s ease-out',
      },
    },
  },
  plugins: [],
};
