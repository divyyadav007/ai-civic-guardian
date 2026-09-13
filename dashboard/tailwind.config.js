/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        civic: {
          50: '#f0f7ff',
          100: '#e0effe',
          500: '#0284c7',
          600: '#0369a1',
          700: '#075985',
          800: '#0c4a6e',
          900: '#082f49',
        },
        status: {
          submitted: '#2563eb',     // Blue
          acknowledged: '#d97706',  // Amber
          in_progress: '#ea580c',   // Orange
          resolved: '#16a34a',      // Green
          rejected: '#64748b',      // Slate / Muted
          duplicate: '#64748b',     // Slate / Muted
        }
      }
    },
  },
  plugins: [],
}
