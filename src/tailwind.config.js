/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Colores Identidad RAÍCES
        'raices-terracota': '#C65D3B',
        'raices-bosque': '#588157',
        'raices-crema': '#F5F1E8',
        'raices-texto': '#2D2A26',
        'raices-soft': '#6B5E4F',
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-5px)' },
          '75%': { transform: 'translateX(5px)' },
        }
      },
      animation: {
        shake: 'shake 0.2s ease-in-out 0s 2',
      }
    },
  },
  plugins: [],
}