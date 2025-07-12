
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
	

      animation: {
        'loader-text': 'text-animation 3.5s ease infinite',
        'loader': 'loading-animation 3.5s ease infinite',
      },
      keyframes: {
        'text-animation': {
          '0%': { letterSpacing: '1px', transform: 'translateX(0px)' },
          '40%': { letterSpacing: '2px', transform: 'translateX(26px)' },
          '80%': { letterSpacing: '1px', transform: 'translateX(32px)' },
          '90%': { letterSpacing: '2px', transform: 'translateX(0px)' },
          '100%': { letterSpacing: '1px', transform: 'translateX(0px)' },
        },
        'loading-animation': {
          '0%': { width: '1rem', transform: 'translateX(0px)' },
          '40%': { width: '100%', transform: 'translateX(0px)' },
          '80%': { width: '1rem', transform: 'translateX(4rem)' },
          '90%': { width: '100%', transform: 'translateX(0px)' },
          '100%': { width: '1rem', transform: 'translateX(0px)' },
        },
      },
    },
  },
  variants: {},
  plugins: [require('tailwind-scrollbar-hide')],

}
