import 'dotenv/config';

// Mock Supabase e orçamentos offline para evitar I/O externo em testes
process.env.MOCK_SUPABASE = process.env.MOCK_SUPABASE || 'true';
process.env.QUOTE_OFFLINE_FALLBACK = process.env.QUOTE_OFFLINE_FALLBACK || 'true';

// Use fake JSON to bypass LLM randomness when needed in tests (pode ser sobrescrito por teste)
process.env.LLM_FAKE_JSON = process.env.LLM_FAKE_JSON || '';

// Mantém o roteador por IA ligado; usamos LLM_FAKE_JSON quando necessário
process.env.USE_AI_ROUTER = process.env.USE_AI_ROUTER || 'true';

// API base for local calls in toolsRuntime
process.env.API_URL = process.env.API_URL || 'http://127.0.0.1:3001';


// Ensure WhatsApp client or any polling is not started in test env
process.env.WA_HEADLESS = 'true';
process.env.WA_DATA_PATH = process.env.WA_DATA_PATH || '""';
