/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        staps: {
          ink: "#122620",
          orange: "#ed6a2f",
          gold: "#f4b942",
          cream: "#fff8ed",
          mist: "#eef4ec",
          sage: "#98b6a0",
        },
      },
      boxShadow: {
        soft: "0 18px 40px rgba(18, 38, 32, 0.08)",
      },
      fontFamily: {
        display: ["Poppins", "ui-sans-serif", "system-ui"],
        body: ["Manrope", "ui-sans-serif", "system-ui"],
      },
      backgroundImage: {
        hero:
          "radial-gradient(circle at top left, rgba(244,185,66,0.45), transparent 38%), radial-gradient(circle at bottom right, rgba(152,182,160,0.35), transparent 33%)",
      },
    },
  },
  plugins: [],
};

