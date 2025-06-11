
import { serviceEventQueryService } from './serviceEventQueryService';
import { serviceEventMutationService } from './serviceEventMutationService';

export const serviceEventService = {
  ...serviceEventQueryService,
  ...serviceEventMutationService
};
