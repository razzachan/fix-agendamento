
import { clientQueryService } from './clientQueryService';
import { clientMutationService } from './clientMutationService';

export const clientService = {
  ...clientQueryService,
  ...clientMutationService,
  // Explicitly export the mergeDuplicateClients function for direct access
  mergeDuplicateClients: clientMutationService.mergeDuplicateClients
};
