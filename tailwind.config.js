// @ts-check

/** @type {import("tailwindcss").Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,css}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: ['class'],
  theme: {
    extend: {
      fontFamily: {
        recursive: ['var(--font-recursive)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
