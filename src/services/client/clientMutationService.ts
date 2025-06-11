
import { clientCreateService, clientUpdateService, clientDeleteService, clientMergeService } from './mutations';

export const clientMutationService = {
  create: clientCreateService.create,
  update: clientUpdateService.update,
  delete: clientDeleteService.delete,
  deleteAll: clientDeleteService.deleteAll,
  deleteByNames: clientDeleteService.deleteByNames,
  verifyClientCreation: clientCreateService.verifyClientCreation,
  mergeDuplicateClients: clientMergeService.mergeDuplicateClients
};
