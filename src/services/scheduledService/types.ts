
import { ScheduledService } from '@/types';

export interface ScheduledServiceCreateParams extends Omit<ScheduledService, 'id'> {}

export interface ScheduledServiceFromOrderParams {
  serviceOrderId: string;
  clientName: string;
  description: string;
  address: string;
  technicianId: string;
  technicianName: string;
  scheduledDateTime: Date;
}
