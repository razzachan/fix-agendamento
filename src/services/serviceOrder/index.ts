
import { serviceOrderQueryService } from './queries';
import { serviceOrderMutationService } from './mutations';
import { serviceOrderImageService } from './serviceOrderImageService';
import serviceOrderProgressService from '../serviceOrderProgress/serviceOrderProgressService';

export const serviceOrderService = {
  ...serviceOrderQueryService,
  ...serviceOrderMutationService,
  // Exportar explicitamente os métodos do imageService para evitar problemas
  uploadImage: serviceOrderImageService.uploadImage,
  saveImages: serviceOrderImageService.saveImages,
  // Adicionar métodos do serviço de progresso
  getServiceOrderProgress: serviceOrderProgressService.getServiceOrderProgress,
  addProgressEntry: serviceOrderProgressService.addProgressEntry,
  updateServiceOrderStatus: serviceOrderProgressService.updateServiceOrderStatus,
};
