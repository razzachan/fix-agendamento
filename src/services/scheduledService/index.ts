
import { scheduledServiceQueryService } from './queryService';
import { scheduledServiceMutationService } from './mutationService';

// Export all functionality from the separate modules under a single service object
export const scheduledServiceService = {
  // Query methods
  getAll: scheduledServiceQueryService.getAll,
  getByTechnicianId: scheduledServiceQueryService.getByTechnicianId,
  getByDateRange: scheduledServiceQueryService.getByDateRange,
  getTechnicianSchedule: scheduledServiceQueryService.getTechnicianSchedule,
  getByClientId: scheduledServiceQueryService.getByClientId,
  checkIfTechnicianHasAnyServices: scheduledServiceQueryService.checkIfTechnicianHasAnyServices,
  
  // Mutation methods
  createScheduledService: scheduledServiceMutationService.createScheduledService,
  createFromServiceOrder: scheduledServiceMutationService.createFromServiceOrder,
  updateServiceStatus: scheduledServiceMutationService.updateServiceStatus,
  updateServiceDateTime: scheduledServiceMutationService.updateServiceDateTime,
};
