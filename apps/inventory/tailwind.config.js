import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packagesGlob = path.resolve(__dirname, '../../packages').split(path.sep).join('/') + '/**/*.{js,jsx}';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
    packagesGlob,
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        admin: {
          50: '#FDF2F4',
          100: '#FFE8EC',
          200: '#FECDD3',
          300: '#FDA4AF',
          400: '#FB7185',
          500: '#F42B50',
          600: '#E31837',
          700: '#C7122E',
          800: '#9F0E24',
          900: '#7F0A1D',
          950: '#4C0510',
        },
        navy: {
          850: '#2F2F2F',
          900: '#252525',
          950: '#1C1C1C',
        },
        brand: {
          header: '#252525',
          'header-dark': '#1C1C1C',
          'header-light': '#2F2F2F',
          red: '#E31837',
          'red-hover': '#C7122E',
          'red-light': '#FDF2F4',
          'red-subtle': '#FFE8EC',
          secondaryRed: '#F42B50',
          accentPink: '#F05A82',
          bg: '#F5F5F5',
          card: '#FFFFFF',
          text: '#222222',
          muted: '#777777',
          'muted-light': '#999999',
          border: '#E8E8E8',
          'border-light': '#F0F0F0',
          success: '#16A34A',
          warning: '#F59E0B',
          amber: '#D97706',
        },
        unikart: {
          header: '#252525',
          primary: '#E31837',
          'primary-dark': '#C7122E',
          'primary-light': '#FDF2F4',
          secondary: '#F42B50',
          'secondary-hover': '#DC2626',
          accent: '#F05A82',
          bg: '#F5F5F5',
          surface: '#FFFFFF',
          text: '#222222',
        }
      },
      boxShadow: {
        'xs': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
};
