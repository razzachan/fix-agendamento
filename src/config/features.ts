// Central feature flags for the app (controlled via Vite env)
// To enable booking tests in non-production, set VITE_FEATURE_SCHEDULE_TESTS=true
export const features = {
  // Allow "Salvar como TESTE" on the Bot Schedule page in non-production environments
  scheduleTests: String(import.meta.env.VITE_FEATURE_SCHEDULE_TESTS) === 'true',
};

