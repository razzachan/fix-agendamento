import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Importar rotas
import serviceOrderRoutes from './routes/serviceOrderRoutes.js';
import clientRoutes from './routes/clientRoutes.js';
import technicianRoutes from './routes/technicianRoutes.js';
import financialRoutes from './routes/financialRoutes.js';
import scheduledServiceRoutes from './routes/scheduledServiceRoutes.js';
import authRoutes from './routes/authRoutes.js';
import warrantyRoutes from './routes/warrantyRoutes.js';
import serviceOrderProgressRoutes from './routes/serviceOrderProgressRoutes.js';

// Configuração
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/service-orders', serviceOrderRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/technicians', technicianRoutes);
app.use('/api/financial', financialRoutes);
app.use('/api/scheduled-services', scheduledServiceRoutes);
app.use('/api/warranty', warrantyRoutes);
app.use('/api/service-order-progress', serviceOrderProgressRoutes);

// Rota de status da API
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
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
app.listen(PORT, () => {
  console.log(`Servidor API rodando na porta ${PORT}`);
});

export default app;
