export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./src/pages/**/*.{js,jsx}", // Ensure pages are scanned
    "./src/components/**/*.{js,jsx}", // Ensure components are scanned
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
