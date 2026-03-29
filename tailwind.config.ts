import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  'rgb(var(--p-50) / <alpha-value>)',
          100: 'rgb(var(--p-100) / <alpha-value>)',
          200: 'rgb(var(--p-200) / <alpha-value>)',
          300: 'rgb(var(--p-300) / <alpha-value>)',
          400: 'rgb(var(--p-400) / <alpha-value>)',
          500: 'rgb(var(--p-500) / <alpha-value>)',
          600: 'rgb(var(--p-600) / <alpha-value>)',
          700: 'rgb(var(--p-700) / <alpha-value>)',
          800: 'rgb(var(--p-800) / <alpha-value>)',
          900: 'rgb(var(--p-900) / <alpha-value>)',
          950: 'rgb(var(--p-950) / <alpha-value>)',
        },
        accent: {
          50:  'rgb(var(--a-50) / <alpha-value>)',
          100: 'rgb(var(--a-100) / <alpha-value>)',
          200: 'rgb(var(--a-200) / <alpha-value>)',
          300: 'rgb(var(--a-300) / <alpha-value>)',
          400: 'rgb(var(--a-400) / <alpha-value>)',
          500: 'rgb(var(--a-500) / <alpha-value>)',
          600: 'rgb(var(--a-600) / <alpha-value>)',
          700: 'rgb(var(--a-700) / <alpha-value>)',
          800: 'rgb(var(--a-800) / <alpha-value>)',
          900: 'rgb(var(--a-900) / <alpha-value>)',
          950: 'rgb(var(--a-950) / <alpha-value>)',
        },
        grappler: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        success: '#22c55e',
        warning: '#eab308',
        error: '#ef4444',
        strength: '#dc2626',
        hypertrophy: '#8b5cf6',
        power: '#14b8a6',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Cal Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
        'gradient': 'gradient 8s ease infinite',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'ring-breathe': 'ring-breathe 3s ease-in-out infinite',
      },
      keyframes: {
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'ring-breathe': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.03)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'hero-pattern': 'linear-gradient(135deg, rgb(var(--p-900)) 0%, #0f172a 50%, #334155 100%)',
      },
    },
  },
  plugins: [],
};

export default config;
