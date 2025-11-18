import { colors } from "./src/styles/colors"

/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ["./src/**/*.{js,jsx,ts,tsx}"],
	presets: [require("nativewind/preset")],
	theme: {
		extend: {
			colors: colors,
			fontFamily: {
				regular: "Inter_400Regular",
				semiBold: "Inter_600SemiBold",
				bold: "Inter_700Bold",
			},
		},
	},
	plugins: [],
}
