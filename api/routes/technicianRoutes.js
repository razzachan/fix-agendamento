import express from 'express';
import { body, param } from 'express-validator';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import technicianController from '../controllers/technicianController.js';

const router = express.Router();

// Obter todos os técnicos
router.get('/', 
  requireAuth,
  technicianController.getAllTechnicians
);

// Obter um técnico específico
router.get('/:id',
  requireAuth,
  param('id').isString().notEmpty(),
  technicianController.getTechnicianById
);

// Criar um novo técnico
router.post('/',
  requireAuth,
  requireAdmin,
  [
    body('name').isString().notEmpty(),
    body('email').isEmail().notEmpty(),
    body('phone').isString().optional({ nullable: true }),
    body('specialties').isArray().optional(),
    body('isActive').isBoolean().optional()
  ],
  technicianController.createTechnician
);

// Atualizar um técnico
router.put('/:id',
  requireAuth,
  requireAdmin,
  param('id').isString().notEmpty(),
  technicianController.updateTechnician
);

// Excluir um técnico
router.delete('/:id',
  requireAuth,
  requireAdmin,
  param('id').isString().notEmpty(),
  technicianController.deleteTechnician
);

// Atualizar localização do técnico
router.patch('/:id/location',
  requireAuth,
  [
    param('id').isString().notEmpty(),
    body('latitude').isNumeric().notEmpty(),
    body('longitude').isNumeric().notEmpty()
  ],
  technicianController.updateTechnicianLocation
);

// Obter técnicos disponíveis
router.get('/status/available',
  requireAuth,
  technicianController.getAvailableTechnicians
);

export default router;
