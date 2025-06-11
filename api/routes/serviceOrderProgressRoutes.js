import express from 'express';
import { body, param } from 'express-validator';
import { requireAuth } from '../middleware/auth.js';
import serviceOrderProgressController from '../controllers/serviceOrderProgressController.js';

const router = express.Router();

// Obter histórico de progresso de uma ordem de serviço
router.get('/:serviceOrderId',
  requireAuth,
  param('serviceOrderId').isString().notEmpty(),
  serviceOrderProgressController.getServiceOrderProgress
);

// Adicionar um novo registro de progresso
router.post('/',
  requireAuth,
  [
    body('serviceOrderId').isString().notEmpty(),
    body('status').isString().notEmpty(),
    body('notes').isString().optional({ nullable: true }),
    body('createdBy').isString().optional({ nullable: true })
  ],
  serviceOrderProgressController.addServiceOrderProgress
);

export default router;
