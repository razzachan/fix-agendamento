import express from 'express';
import { body, param, query } from 'express-validator';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import serviceOrderController from '../controllers/serviceOrderController.js';

const router = express.Router();

// Obter todas as ordens de serviço
router.get('/',
  requireAuth,
  serviceOrderController.getAllServiceOrders
);

// Obter uma ordem de serviço específica
router.get('/:id',
  requireAuth,
  param('id').isString().notEmpty(),
  serviceOrderController.getServiceOrderById
);

// Obter ordens de serviço por cliente
router.get('/client/:clientId',
  requireAuth,
  param('clientId').isString().notEmpty(),
  serviceOrderController.getServiceOrdersByClientId
);

// Obter ordens de serviço por técnico
router.get('/technician/:technicianId',
  requireAuth,
  param('technicianId').isString().notEmpty(),
  serviceOrderController.getServiceOrdersByTechnicianId
);

// Criar uma nova ordem de serviço
router.post('/',
  requireAuth,
  [
    body('clientId').isString().notEmpty(),
    body('clientName').isString().notEmpty(),
    body('clientEmail').isEmail().optional({ nullable: true }),
    body('clientPhone').isString().optional({ nullable: true }),
    body('description').isString().notEmpty(),
    body('equipmentType').isString().notEmpty(),
    body('status').isString().optional()
  ],
  serviceOrderController.createServiceOrder
);

// Atualizar uma ordem de serviço
router.put('/:id',
  requireAuth,
  param('id').isString().notEmpty(),
  serviceOrderController.updateServiceOrder
);

// Excluir uma ordem de serviço
router.delete('/:id',
  requireAuth,
  requireAdmin,
  param('id').isString().notEmpty(),
  serviceOrderController.deleteServiceOrder
);

// Atribuir técnico a uma ordem de serviço
router.post('/:id/assign-technician',
  requireAuth,
  requireAdmin,
  [
    param('id').isString().notEmpty(),
    body('technicianId').isString().notEmpty()
  ],
  serviceOrderController.assignTechnician
);

// Atualizar status de uma ordem de serviço
router.patch('/:id/status',
  requireAuth,
  [
    param('id').isString().notEmpty(),
    body('status').isString().notEmpty(),
    body('notes').isString().optional(),
    body('cancellationReason').isString().optional()
  ],
  serviceOrderController.updateServiceOrderStatus
);

// Obter histórico de progresso de uma ordem de serviço
router.get('/:id/progress',
  requireAuth,
  param('id').isString().notEmpty(),
  serviceOrderController.getServiceOrderProgress
);

export default router;
