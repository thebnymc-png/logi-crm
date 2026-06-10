/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0efff',
          200: '#b8dbff',
          300: '#7ac0ff',
          400: '#3aa0ff',
          500: '#0176d3',
          600: '#014486',
          700: '#032d60',
          800: '#001d3f',
          900: '#001228',
        },
        sf: {
          blue: '#0176d3',
          darkBlue: '#032d60',
          navyBlue: '#001d3f',
          green: '#2e844a',
          red: '#ba0517',
          orange: '#dd7a01',
          purple: '#7526c4',
        },
        surface: {
          DEFAULT: '#ffffff',
          secondary: '#f3f3f3',
          tertiary: '#fafaf9',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 2px 2px 0 rgba(0, 0, 0, 0.1)',
        'card-hover': '0 2px 8px 0 rgba(0, 0, 0, 0.12)',
        'dropdown': '0 2px 8px 0 rgba(0, 0, 0, 0.16)',
        'modal': '0 4px 16px 0 rgba(0, 0, 0, 0.16)',
        'header': '0 2px 4px 0 rgba(0, 0, 0, 0.07)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
        'slide-in': 'slideIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideIn: { '0%': { opacity: '0', transform: 'translateX(-8px)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
      },
    },
  },
  plugins: [],
};
