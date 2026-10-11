/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bharat: {
          bg: '#FAF9F5',
          paper: '#FFFFFF',
          saffron: '#FF9933',
          terracotta: '#D9532F',
          terracottaHover: '#C34422',
          green: '#0D6E4F',
          greenLight: '#E8F5E9',
          amber: '#D97706',
          amberLight: '#FEF3C7',
          blue: '#0284C7',
          blueLight: '#E0F2FE',
          slate: '#0F172A',
          border: '#E5E7EB',
          grid: 'rgba(0, 0, 0, 0.035)'
        },
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        display: ['Plus Jakarta Sans', 'Outfit', 'sans-serif']
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'radar-sweep': 'radarSweep 4s linear infinite',
        'ripple': 'ripple 3s cubic-bezier(0, 0.2, 0.8, 1) infinite',
        'float': 'float 3s ease-in-out infinite alternate',
      },
      keyframes: {
        radarSweep: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' }
        },
        ripple: {
          '0%': { transform: 'scale(0.8)', opacity: '1' },
          '100%': { transform: 'scale(2.4)', opacity: '0' }
        },
        float: {
          '0%': { transform: 'translateY(0px)' },
          '100%': { transform: 'translateY(-6px)' }
        }
      }
    },
  },
  plugins: [],
}
