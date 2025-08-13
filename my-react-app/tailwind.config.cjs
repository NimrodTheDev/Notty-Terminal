 // tailwind.config.js
 module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        'custom-dark-blue': '#11141F',
        'custom-light-purple': '#7E6DC8',
        "custom-hero-back": '#080a0f',
        "custom-nav-purple": "#1F1A31",
        "custom-search-gray": "#232842"
      },
      gridTemplateColumns: {
        'custom-2-1': '2fr 1fr',
        'custom-3-1': '3fr 1fr',
      },
      keyframes: {
        'wobble1': {
          '0%, 100%': { transform: 'translateY(0%) scale(1)', opacity: '1' },
          '50%': { transform: 'translateY(-66%) scale(0.65)', opacity: '0.8' },
        },
        'wobble2': {
          '0%, 100%': { transform: 'translateY(0%) scale(1)', opacity: '1' },
          '50%': { transform: 'translateY(66%) scale(0.65)', opacity: '0.8' },
        },
        'wobble3': {
          '0%, 100%': { transform: 'translateY(0%) scale(1)', opacity: '1' },
          '50%': { transform: 'translateY(66%) scale(0.65)', opacity: '0.8' },
        },
      },
      animation: {
        'wobble1': 'wobble1 1.6s infinite ease-in-out',
        'wobble2': 'wobble2 1.6s infinite ease-in-out',
        'wobble3': 'wobble3 1.6s infinite ease-in-out',
      },
    },
  },
  variants: {},
  plugins: [require('tailwind-scrollbar-hide')],
}
