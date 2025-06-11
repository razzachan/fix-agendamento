import express from 'express';
import { body, param, query } from 'express-validator';
import { requireAuth, requireAdmin, requireTechnician } from '../middleware/auth.js';
import scheduledServiceController from '../controllers/scheduledServiceController.js';

const router = express.Router();

// Obter todos os serviços agendados
router.get('/', 
  requireAuth,
  scheduledServiceController.getAllScheduledServices
);

// Obter um serviço agendado específico
router.get('/:id',
  requireAuth,
  param('id').isString().notEmpty(),
  scheduledServiceController.getScheduledServiceById
);

// Obter serviços agendados por técnico
router.get('/technician/:technicianId',
  requireAuth,
  param('technicianId').isString().notEmpty(),
  scheduledServiceController.getScheduledServicesByTechnicianId
);

// Obter serviços agendados por cliente
router.get('/client/:clientId',
  requireAuth,
  param('clientId').isString().notEmpty(),
  scheduledServiceController.getScheduledServicesByClientId
);

// Obter serviços agendados por intervalo de datas
router.get('/date-range',
  requireAuth,
  [
    query('startDate').isISO8601().notEmpty(),
    query('endDate').isISO8601().notEmpty()
  ],
  scheduledServiceController.getScheduledServicesByDateRange
);

// Criar um novo serviço agendado
router.post('/',
  requireAuth,
  requireAdmin,
  [
    body('description').isString().notEmpty(),
    body('clientId').isString().optional({ nullable: true }),
    body('clientName').isString().notEmpty(),
    body('address').isString().notEmpty(),
    body('technicianId').isString().optional({ nullable: true }),
    body('technicianName').isString().notEmpty(),
    body('scheduledStartTime').isISO8601().notEmpty(),
    body('scheduledEndTime').isISO8601().notEmpty(),
    body('status').isString().optional()
  ],
  scheduledServiceController.createScheduledService
);

// Atualizar um serviço agendado
router.put('/:id',
  requireAuth,
  requireAdmin,
  param('id').isString().notEmpty(),
  scheduledServiceController.updateScheduledService
);

// Excluir um serviço agendado
router.delete('/:id',
  requireAuth,
  requireAdmin,
  param('id').isString().notEmpty(),
  scheduledServiceController.deleteScheduledService
);

// Atualizar status de um serviço agendado
router.patch('/:id/status',
  requireAuth,
  requireTechnician,
  [
    param('id').isString().notEmpty(),
    body('status').isString().notEmpty()
  ],
  scheduledServiceController.updateScheduledServiceStatus
);

export default router;
