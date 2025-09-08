module.exports = {
  // Override root PostCSS config during tests to avoid requiring TailwindCSS.
  // This prevents Vitest/Vite from attempting to load `tailwindcss` in CI.
  plugins: [],
};

