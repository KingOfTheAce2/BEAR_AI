/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./public/index.html",
  ],
  theme: {
    extend: {
      colors: {
        'bear-navy': {
          DEFAULT: '#1B365C',
          light: '#2A4A73',
          dark: '#0F1F3A',
        },
        'bear-green': {
          DEFAULT: '#059669',
          light: '#10B981',
          dark: '#047857',
        },
        'bear-red': {
          DEFAULT: '#DC2626',
          light: '#EF4444',
          dark: '#B91C1C',
        },
        'bear-gray': {
          DEFAULT: '#6B7280',
          light: '#9CA3AF',
          dark: '#4B5563',
        }
      },
      fontFamily: {
        inter: ['Inter', 'system-ui', 'sans-serif'],
        'inter-tight': ['Inter Tight', 'Inter', 'system-ui', 'sans-serif'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'bounce-gentle': 'bounceGentle 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
      boxShadow: {
        'legal': '0 4px 6px -1px rgba(27, 54, 92, 0.1), 0 2px 4px -1px rgba(27, 54, 92, 0.06)',
        'legal-lg': '0 10px 15px -3px rgba(27, 54, 92, 0.1), 0 4px 6px -2px rgba(27, 54, 92, 0.05)',
      },
      backgroundImage: {
        'gradient-legal': 'linear-gradient(135deg, #1B365C 0%, #059669 100%)',
        'gradient-legal-light': 'linear-gradient(135deg, #2A4A73 0%, #10B981 100%)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/line-clamp'),
  ],
};