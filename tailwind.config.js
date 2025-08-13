/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['"Instrument Serif"', 'serif'],
      },
      letterSpacing: {
        serif: '0.05em',
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.8125rem', { lineHeight: '1.25rem' }],
        'base': ['0.875rem', { lineHeight: '1.375rem' }],
        'lg': ['1rem', { lineHeight: '1.5rem' }],
        'xl': ['1.125rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.25rem', { lineHeight: '1.875rem' }],
        '3xl': ['1.5rem', { lineHeight: '2rem' }],
        '4xl': ['2rem', { lineHeight: '2.5rem' }],
        serif: ['1.5rem'],
      },
    },
  },
  plugins: [
    function ({ addUtilities, theme }) {
      addUtilities({
        '.font-serif': {
          fontFamily: theme('fontFamily.serif'),
          letterSpacing: theme('letterSpacing.serif'),
        },
        '.font-serifTitle': {
          fontFamily: theme('fontFamily.serif'),
          letterSpacing: theme('letterSpacing.serif'),
          fontSize: theme('fontSize.serif'),
        },
      }, ['responsive']);
    }
  ],
};
