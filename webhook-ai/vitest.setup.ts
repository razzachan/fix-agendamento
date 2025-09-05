import 'dotenv/config';

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://hdyucwabemspehokoiks.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkeXVjd2FiZW1zcGVob2tvaWtzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDA0MDc2OSwiZXhwIjoyMDU5NjE2NzY5fQ.G_2PF8hXeXIfl59xmywqpGdWiJC6JEVHFwJkoyBSWc0';

// Mock Supabase e orçamentos offline para evitar I/O externo em testes
process.env.MOCK_SUPABASE = process.env.MOCK_SUPABASE || 'true';
process.env.QUOTE_OFFLINE_FALLBACK = process.env.QUOTE_OFFLINE_FALLBACK || 'true';

// Use fake JSON to bypass LLM randomness when needed in tests (pode ser sobrescrito por teste)
process.env.LLM_FAKE_JSON = process.env.LLM_FAKE_JSON || '';

// Mantém o roteador por IA ligado; usamos LLM_FAKE_JSON quando necessário
process.env.USE_AI_ROUTER = process.env.USE_AI_ROUTER || 'true';

// API base for local calls in toolsRuntime
process.env.API_URL = process.env.API_URL || 'http://127.0.0.1:3001';
