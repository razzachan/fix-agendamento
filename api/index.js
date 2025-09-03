import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { supabase } from './config/supabase.js';
// Importar rotas
import serviceOrderRoutes from './routes/serviceOrderRoutes.js';
import clientRoutes from './routes/clientRoutes.js';
import techniciansRoutes from './routes/techniciansRoutes.js';
import financialRoutes from './routes/financialRoutes.js';
import scheduledServiceRoutes from './routes/scheduledServiceRoutes.js';
import authRoutes from './routes/authRoutes.js';
import warrantyRoutes from './routes/warrantyRoutes.js';
import serviceOrderProgressRoutes from './routes/serviceOrderProgressRoutes.js';
import botRoutes from './routes/botRoutes.js';
import quoteRoutes from './routes/quoteRoutes.js';
import priceListRoutes from './routes/priceListRoutes.js';
import scheduleRoutes from './routes/scheduleRoutes.js';
import assignmentRoutes from './routes/assignmentRoutes.js';
import orderStatusRoutes from './routes/orderStatusRoutes.js';
import workingHoursRoutes from './routes/workingHoursRoutes.js';
import blackoutsRoutes from './routes/blackoutsRoutes.js';
import intentsRoutes from './routes/intentsRoutes.js';
import botTraceRoutes from './routes/botTraceRoutes.js';
import botToolsRoutes from './routes/botToolsRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import visionRoutes from './routes/visionRoutes.js';
import whatsappRoutes from './routes/whatsappRoutes.js';
import brandRulesRoutes from './routes/brandRulesRoutes.js';
import { botAuth } from './middleware/botAuth.js';

// Configuração
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').map(s=>s.trim()).filter(Boolean);
if (ALLOWED_ORIGINS.length) {
  const corsOptions = {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // non-browser / curl
      if (ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      return cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
  };
  app.use(cors(corsOptions));
} else {
  app.use(cors()); // permissivo em dev se não configurado
}
app.use(helmet());
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
  app.use(helmet.hsts({ maxAge: 15552000 })); // 180 dias
}
app.use(morgan('dev'));
import { auditLogger } from './middleware/audit.js';
app.use(auditLogger);
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true }));
// Static assets (serve training images)
import path from 'path';
app.use(express.static('public'));

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/service-orders', serviceOrderRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/technicians', techniciansRoutes);
app.use('/api/financial', financialRoutes);
app.use('/api/scheduled-services', scheduledServiceRoutes);
app.use('/api/warranty', warrantyRoutes);
app.use('/api/service-order-progress', serviceOrderProgressRoutes);
app.use('/api/bot', botRoutes);
app.use('/api/quote', quoteRoutes);
app.use('/api/price_list', priceListRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/assignment', assignmentRoutes);
app.use('/api/orders', orderStatusRoutes);
app.use('/api/working_hours', workingHoursRoutes);
app.use('/api/blackouts', blackoutsRoutes);
app.use('/api/intents', intentsRoutes);
app.use('/api/bot', botTraceRoutes);
app.use('/api/bot/tools', botToolsRoutes);
app.use('/api/analytics', analyticsRoutes);
// Habilita botAuth apenas se BOT_TOKEN estiver configurado; caso contrário, permite (evita 500 em ambientes sem token)
const maybeBotAuth = process.env.BOT_TOKEN ? botAuth : (_req, _res, next) => { if (process.env.NODE_ENV === 'production') { console.warn('[botAuth] BOT_TOKEN ausente. Permitindo /api/vision temporariamente.'); } next(); };
app.use('/api/vision', maybeBotAuth, visionRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/brand-rules', brandRulesRoutes);

// Health-check para storage
app.get('/api/_health/storage', (req, res) => {
  const enabled = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  return res.json({ ok: true, supabaseConfigured: enabled, bucket: process.env.SUPABASE_BUCKET || 'training-images' });
});

// Rota de status da API
app.get('/api/status', async (req, res) => {
  let supa = 'unknown';
  try {
    const { error } = await supabase.from('service_orders').select('id').limit(1);
    supa = error ? 'error' : 'ok';
  } catch { supa = 'error'; }
  res.json({
    status: 'online',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    calendar: {
      gridMin: Number(process.env.CALENDAR_SLOT_MIN || 60),
      lunch: String(process.env.CALENDAR_INJECT_LUNCH || 'true'),
      lunchStart: process.env.CALENDAR_LUNCH_START || '12:00',
      lunchEnd: process.env.CALENDAR_LUNCH_END || '13:00',
    },
    supabase: supa,
  });
});

// Health-check simples para scripts/health-check-all
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'api', ts: new Date().toISOString() });
});


// Tratamento de erros
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: true,
    message: 'Erro interno do servidor',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Iniciar o servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor API rodando na porta ${PORT} (acessível via rede) - NOTES CORRECTION APPLIED`);
});

export default app;
