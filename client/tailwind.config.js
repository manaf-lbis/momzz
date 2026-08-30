/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        display: ['Montserrat', 'Outfit', 'sans-serif'],
      },
      colors: {
        void: {
          950: '#080810', // Deep void canvas
          900: '#0c0c16', // Surface tier 1
          800: '#141424', // Surface tier 2
          700: '#1e1e34', // Border tier
        },
        garage: {
          yellow: '#facc15', // Electric yellow
          gold: '#fbbf24',   // Amber gold
          amber: '#f59e0b',  // Rich amber
          hover: '#eab308',  // Yellow hover
          glow: 'rgba(250, 204, 21, 0.18)',
        },
        industrial: {
          950: '#09090b',
          900: '#18181b',
          800: '#27272a',
          700: '#3f3f46',
          400: '#a1a1aa',
          accent: '#facc15',
          'accent-hover': '#eab308',
          'accent-glow': 'rgba(250, 204, 21, 0.15)',
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      boxShadow: {
        'yellow-glow': '0 0 20px -5px rgba(250, 204, 21, 0.3)',
        'yellow-card': '0 4px 20px -2px rgba(0, 0, 0, 0.5), 0 0 1px 1px rgba(250, 204, 21, 0.15)',
        'glass': '0 8px 32px -8px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
        'glass-dark': '0 8px 32px -8px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        'glass-hover': '0 16px 48px -12px rgba(250, 204, 21, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.7)',
        'glass-hover-dark': '0 16px 48px -12px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(250, 204, 21, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
      },
      backdropBlur: {
        xs: '2px',
        glass: '20px',
        'glass-lg': '32px',
      },
      animation: {
        'border-beam': 'border-beam calc(var(--duration)*1s) infinite linear',
        'shine': 'shine var(--duration) infinite linear',
        'meteor': 'meteor 5s linear infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'pulse-glow': 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ripple': 'ripple var(--duration,2s) ease calc(var(--i, 0)*.2s) infinite',
      },
      keyframes: {
        'border-beam': {
          '100%': {
            'offset-distance': '100%',
          },
        },
        'shine': {
          '0%': {
            'background-position': '0% 0%',
          },
          '50%': {
            'background-position': '100% 100%',
          },
          to: {
            'background-position': '0% 0%',
          },
        },
        'meteor': {
          '0%': { transform: 'rotate(215deg) translateX(0)', opacity: '1' },
          '70%': { opacity: '1' },
          '100%': {
            transform: 'rotate(215deg) translateX(-500px)',
            opacity: '0',
          },
        },
        'shimmer': {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.85', transform: 'scale(1.02)' },
        },
        'ripple': {
          '0%, 100%': {
            transform: 'translate(-50%, -50%) scale(1)',
          },
          '50%': {
            transform: 'translate(-50%, -50%) scale(0.9)',
          },
        },
      },
    },
  },
  plugins: [],
}
