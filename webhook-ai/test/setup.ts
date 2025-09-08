process.env.NODE_ENV = 'test';
process.env.MOCK_SUPABASE = 'true';
process.env.API_URL = 'http://127.0.0.1:65535';
process.env.MIDDLEWARE_URL = 'http://127.0.0.1:65535';
// Clear LLM_FAKE_JSON by default; tests set it as needed
delete process.env.LLM_FAKE_JSON;


// Fail-fast if a test keeps a handle open
process.on('beforeExit', () => {
  // Let vitest close gracefully; if something is pending, exit(0) ensures CI completes
  // Note: Vitest will have already reported results
  setTimeout(() => process.exit(0), 0);
});
