/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // These will be overridden by CSS variables for branding
        primary: {
          50: 'var(--color-primary-50, #f0fdf4)',
          100: 'var(--color-primary-100, #dcfce7)',
          200: 'var(--color-primary-200, #bbf7d0)',
          300: 'var(--color-primary-300, #86efac)',
          400: 'var(--color-primary-400, #4ade80)',
          500: 'var(--color-primary-500, #22c55e)',
          600: 'var(--color-primary-600, #16a34a)',
          700: 'var(--color-primary-700, #15803d)',
          800: 'var(--color-primary-800, #166534)',
          900: 'var(--color-primary-900, #14532d)',
        },
        brand: {
          primary: 'var(--brand-primary, #1e5631)',
          secondary: 'var(--brand-secondary, #d4af37)',
          accent: 'var(--brand-accent, #3b82f6)',
        },
      },
    },
  },
  plugins: [],
}
