
import { getAllServiceOrders } from './getAllServiceOrders';
import { getServiceOrdersByClientId } from './getServiceOrdersByClientId';
import { getServiceOrdersByTechnicianId } from './getServiceOrdersByTechnicianId';
import { getServiceOrderProgress } from './getServiceOrderProgress';

export const serviceOrderQueryService = {
  getAll: getAllServiceOrders,
  getByClientId: getServiceOrdersByClientId,
  getByTechnicianId: getServiceOrdersByTechnicianId,
  getProgress: getServiceOrderProgress
};
