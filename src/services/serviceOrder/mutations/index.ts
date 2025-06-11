
import { createServiceOrder } from './createServiceOrder';
import { updateServiceOrder } from './updateServiceOrder';
import { deleteServiceOrder } from './deleteServiceOrder';
import { deleteAllServiceOrders } from './deleteAllServiceOrders';
import { addProgressEntry } from './addProgressEntry';

export const serviceOrderMutationService = {
  create: createServiceOrder,
  update: updateServiceOrder,
  delete: deleteServiceOrder,
  deleteAll: deleteAllServiceOrders,
  addProgressEntry: addProgressEntry
};
