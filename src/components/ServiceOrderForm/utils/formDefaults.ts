
import { FormValues } from '../types';
import { generateUUID } from '@/utils/uuid';

export const getFormDefaults = (): FormValues => {
  return {
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    clientFullAddress: '',
    clientCpfCnpj: '',
    clientAddressComplement: '',
    clientAddressReference: '',
    serviceItems: [
      {
        id: generateUUID(),
        serviceType: '',
        serviceAttendanceType: 'em_domicilio',
        equipmentType: '',
        equipmentModel: '',
        equipmentSerial: '',
        serviceValue: '',
        clientDescription: '',
      }
    ],
    technicianId: '',
    internalObservation: '',
    clientDescription: '',
    status: 'scheduled',
    scheduledDate: undefined,
    scheduledTime: '',
  };
};
