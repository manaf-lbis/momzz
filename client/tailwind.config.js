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
      },
      colors: {
        industrial: {
          950: '#09090b', // bg-zinc-950
          900: '#18181b', // bg-zinc-900 surface
          800: '#27272a', // border/card hover
          700: '#3f3f46',
          400: '#a1a1aa',
          accent: '#facc15', // yellow-400
          'accent-hover': '#eab308', // yellow-500
          'accent-glow': 'rgba(250, 204, 21, 0.15)',
        }
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
      }
    },
  },
  plugins: [],
}
