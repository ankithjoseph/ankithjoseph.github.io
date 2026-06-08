/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
			fontFamily: {
				sans: ['Inter', 'sans-serif'],
			},
			transitionTimingFunction: {
				'out-quart': 'cubic-bezier(0.25, 1, 0.5, 1)',
				'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
			},
			transitionDuration: {
				'400': '400ms',
				'600': '600ms',
			},
		},
	},
	plugins: [],
}