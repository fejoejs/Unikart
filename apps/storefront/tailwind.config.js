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
  theme: {
    extend: {
      colors: {
        // UNIKART Modern Electronics Red & Charcoal Theme
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
          muted: '#777777',
          'border': '#E8E8E8',
          success: '#16A34A',
          danger: '#E31837',
          warning: '#F59E0B',
        },
        nexora: {
          primary: '#E31837',
          secondary: '#F42B50',
          bg: '#F5F5F5',
          surface: '#FFFFFF',
          text: '#222222',
          muted: '#777777',
          'border': '#E8E8E8',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'xs': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
        'card': '0 2px 8px -2px rgba(0, 0, 0, 0.06), 0 1px 4px -1px rgba(0, 0, 0, 0.04)',
        'hover': '0 10px 25px -4px rgba(227, 24, 55, 0.12), 0 4px 10px -2px rgba(0, 0, 0, 0.06)',
        'elevated': '0 12px 30px -4px rgba(0, 0, 0, 0.08), 0 4px 12px -2px rgba(0, 0, 0, 0.04)',
        'modal': '0 20px 50px -10px rgba(0, 0, 0, 0.25)',
      },
      borderRadius: {
        'card': '12px',
        'pill': '9999px',
      }
    },
  },
  plugins: [],
}
