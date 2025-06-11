
import React, { useEffect } from 'react';
import { ServiceOrder } from '@/types';

interface AttendanceTypeInfoProps {
  serviceOrder: ServiceOrder;
}

const AttendanceTypeInfo: React.FC<AttendanceTypeInfoProps> = ({ serviceOrder }) => {
  // Obter e validar o tipo de atendimento, com log detalhado
  const attendanceType = serviceOrder.serviceAttendanceType;

  if (!attendanceType) {
    return null;
  }

  // Validar o tipo de atendimento - sem fallback para deixar explícito caso não exista
  const validType = ["em_domicilio", "coleta_conserto", "coleta_diagnostico"].includes(attendanceType)
    ? attendanceType
    : null;

  if (!validType) {
    return null;
  }

  let attendanceTypeLabel = '';

  switch (validType) {
    case 'em_domicilio':
      attendanceTypeLabel = 'Serviço em Domicílio';
      break;
    case 'coleta_conserto':
      attendanceTypeLabel = 'Coleta para Conserto';
      break;
    case 'coleta_diagnostico':
      attendanceTypeLabel = 'Coleta para Diagnóstico';
      break;
  }

  return (
    <div className="text-sm bg-muted/50 p-3 rounded-md mt-4 text-center">
      <span className="font-medium">Tipo de Atendimento:</span>{' '}
      <span className="text-primary">{attendanceTypeLabel}</span>
    </div>
  );
};

export default AttendanceTypeInfo;
