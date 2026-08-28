
/** @type {import('tailwindcss').Config} */
export default {
  content: [
  './index.html',
  './src/**/*.{js,ts,jsx,tsx}'
],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        health: {
          50: '#F5F8F8',
          100: '#EBF6F6',
          200: '#DDF2F1',
          300: '#B8DEDE',
          400: '#A8D8D8',
          500: '#55BFC2',
          600: '#3AAFA9',
          700: '#2A8F93',
          800: '#1C696D',
          900: '#18313A',
        },
        slateText: '#18313A',
        mutedText: '#64777C',
        primary: {
          50: '#F4FAF9',
          100: '#EBF7F7',
          200: '#DDF2F1',
          300: '#B8DEDE',
          400: '#A8D8D8',
          500: '#55BFC2',
          600: '#3AAFA9',
          700: '#2A8F93',
          800: '#1C696D',
          900: '#18313A',
        },
        success: {
          50: '#EBF8F4',
          100: '#D6F2E9',
          500: '#5DBB9A',
          600: '#48A383',
        },
        warning: {
          50: '#FDF8ED',
          100: '#FBF0D8',
          500: '#E8B86A',
          600: '#D4A050',
        },
        critical: {
          50: '#FDF2F2',
          100: '#FCE4E4',
          500: '#D96C6C',
          600: '#C25252',
        }
      }
    },
  },
  plugins: [],
}
