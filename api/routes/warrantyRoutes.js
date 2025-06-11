import express from 'express';
import { body, param, query } from 'express-validator';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import warrantyController from '../controllers/warrantyController.js';

const router = express.Router();

// Configurar garantia para uma ordem de serviço
router.post('/',
  requireAuth,
  [
    body('serviceOrderId').isString().notEmpty(),
    body('warrantyPeriod').isInt({ min: 1 }).notEmpty(),
    body('warrantyStartDate').isString().notEmpty(),
    body('warrantyEndDate').isString().notEmpty(),
    body('warrantyTerms').isString().optional({ nullable: true })
  ],
  warrantyController.configureWarranty
);

// Atualizar configuração de garantia
router.put('/service-order/:serviceOrderId',
  requireAuth,
  param('serviceOrderId').isString().notEmpty(),
  warrantyController.updateWarranty
);

// Verificar status de garantia
router.get('/status/:serviceOrderId',
  requireAuth,
  param('serviceOrderId').isString().notEmpty(),
  warrantyController.checkWarrantyStatus
);

// Criar uma nova ordem de serviço em garantia
router.post('/service-orders',
  requireAuth,
  [
    body('originalOrderId').isString().notEmpty(),
    body('notes').isString().optional({ nullable: true })
  ],
  warrantyController.createWarrantyServiceOrder
);

// Obter ordens de serviço em garantia relacionadas a uma ordem original
router.get('/related/:originalOrderId',
  requireAuth,
  param('originalOrderId').isString().notEmpty(),
  warrantyController.getRelatedWarrantyOrders
);

// Obter ordens de serviço com garantia próxima do vencimento
router.get('/expiring-soon/:thresholdDays',
  requireAuth,
  param('thresholdDays').isInt({ min: 1 }).optional(),
  warrantyController.getWarrantiesNearingExpiration
);

export default router;
