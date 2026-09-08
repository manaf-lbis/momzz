/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '1.5rem',
        lg: '2rem',
      },
      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1280px',
      },
    },
    extend: {
      fontFamily: {
        sans: ['"BankGothic Md BT Medium"', '"BankGothic Md BT"', '"Bank Gothic"', 'BankGothic', 'Outfit', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        display: ['"BankGothic Md BT Medium"', '"BankGothic Md BT"', '"Bank Gothic"', 'BankGothic', 'Montserrat', 'Outfit', 'sans-serif'],
      },
      colors: {
        void: {
          950: '#080811', // Deep luxury void canvas
          900: '#0c0d18', // Surface tier 1
          800: '#131525', // Surface tier 2
          700: '#1d2038', // Border tier
        },
        garage: {
          yellow: '#facc15', // Electric yellow
          gold: '#fbbf24',   // Amber gold
          amber: '#f59e0b',  // Rich amber
          hover: '#eab308',  // Yellow hover
          glow: 'rgba(250, 204, 21, 0.18)',
        },
        glass: {
          card: 'rgba(255, 255, 255, 0.035)',
          'card-hover': 'rgba(255, 255, 255, 0.065)',
          border: 'rgba(255, 255, 255, 0.08)',
          'border-highlight': 'rgba(255, 255, 255, 0.18)',
          dock: 'rgba(12, 14, 26, 0.78)',
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
        'glass-sheen': 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.01) 100%)',
        'glass-gold': 'linear-gradient(135deg, #fde047 0%, #f59e0b 100%)',
      },
      boxShadow: {
        'yellow-glow': '0 0 20px -5px rgba(250, 204, 21, 0.3)',
        'yellow-card': '0 4px 20px -2px rgba(0, 0, 0, 0.5), 0 0 1px 1px rgba(250, 204, 21, 0.15)',
        'glass-minimal': '0 8px 32px -8px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        'glass-elevated': '0 20px 48px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.08), inset 0 1px 1px rgba(255, 255, 255, 0.15)',
        'glass-glow-gold': '0 8px 32px -4px rgba(245, 158, 11, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.4)',
        'glass': '0 8px 32px -8px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
        'glass-dark': '0 8px 32px -8px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
      },
      backdropBlur: {
        xs: '2px',
        glass: '20px',
        'glass-lg': '28px',
        'glass-xl': '36px',
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
