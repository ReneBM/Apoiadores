/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eef4ff',
          100: '#dce8ff',
          200: '#b2cfff',
          300: '#77aaff',
          400: '#3480ff',
          500: '#0a5cf5',
          600: '#003dd1',
          700: '#002fa8',
          800: '#062a89',
          900: '#0b2770',
          950: '#091847',
        },
        slate: {
          850: '#172033',
          950: '#0b1120',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      screens: {
        xs: '375px',
      },
      minHeight: {
        touch: '48px',
      },
      fontSize: {
        'input': ['16px', { lineHeight: '1.5' }],
      },
      boxShadow: {
        'card': '0 2px 12px 0 rgba(0,0,0,0.35)',
        'nav':  '0 -2px 16px 0 rgba(0,0,0,0.4)',
      },
      borderRadius: {
        'xl2': '1.25rem',
      },
    },
  },
  plugins: [],
};
