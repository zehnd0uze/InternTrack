/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#e8edf5',
          100: '#c5d0e6',
          200: '#9fb0d4',
          300: '#7990c2',
          400: '#5c78b5',
          500: '#3f60a8',
          600: '#2e509e',
          700: '#1B3A6B',
          800: '#162f56',
          900: '#0f2040',
        },
        accent: {
          DEFAULT: '#F5A623',
          light: '#FFD080',
          dark: '#C47E0A',
        },
        success: '#10B981',
        warning: '#F59E0B',
        danger:  '#EF4444',
        surface: {
          DEFAULT: '#fafafa',
          card:    '#ffffff',
          dark:    '#18181b',
        },
        sidebar: {
          DEFAULT: 'var(--bg-sidebar)',
          fg: 'var(--text-sidebar)',
          muted: 'var(--text-sidebar-muted)',
          hover: 'var(--bg-sidebar-hover)',
          active: 'var(--bg-sidebar-active)',
          activeFg: 'var(--text-sidebar-active)',
          border: 'var(--border-sidebar)',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Sarabun', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(0,0,0,0.05)',
        'card-hover': '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05)',
        'card-lg': '0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -4px rgba(0,0,0,0.05)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
