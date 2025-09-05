process.env.NODE_ENV = 'test';
process.env.MOCK_SUPABASE = 'true';
process.env.API_URL = 'http://127.0.0.1:65535';
process.env.MIDDLEWARE_URL = 'http://127.0.0.1:65535';
// Clear LLM_FAKE_JSON by default; tests set it as needed
delete process.env.LLM_FAKE_JSON;

