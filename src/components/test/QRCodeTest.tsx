import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import QRCodeGenerator from '@/components/qrcode/QRCodeGenerator';
import { ServiceOrder } from '@/types';

const QRCodeTest: React.FC = () => {
  // Dados de teste para simular uma ordem de serviço
  const testServiceOrder: ServiceOrder = {
    id: 'test-qr-' + Date.now(),
    orderNumber: 'OS #TEST001',
    clientId: 'test-client',
    clientName: 'Cliente Teste QR Code',
    clientEmail: 'teste@email.com',
    clientPhone: '(11) 99999-9999',
    clientCpfCnpj: '123.456.789-00',
    clientAddressComplement: 'Apto 101',
    clientAddressReference: 'Próximo ao mercado',
    technicianId: 'test-tech',
    technicianName: 'Técnico Teste',
    status: 'scheduled',
    createdAt: new Date().toISOString(),
    scheduledDate: new Date().toISOString(),
    scheduledTime: '14:00',
    completedDate: null,
    description: 'Teste de geração de QR Code',
    equipmentType: 'Microondas - Panasonic',
    equipmentModel: 'NN-ST67HS',
    equipmentSerial: 'TEST123456',
    needsPickup: true,
    pickupAddress: 'Rua Teste, 123',
    pickupCity: 'São Paulo',
    pickupState: 'SP',
    pickupZipCode: '01234-567',
    currentLocation: 'client',
    serviceAttendanceType: 'coleta_conserto', // Tipo que precisa de QR Code
    clientDescription: 'Equipamento não liga',
    images: [],
    serviceItems: [],
    finalCost: 150.00,
    workshopId: null,
    workshopName: null,
    agendamentoId: null
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">
              🧪 Teste de QR Code - Sistema Fix Fogões
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center text-muted-foreground mb-4">
              <p>Esta é uma página de teste para verificar se o sistema de QR Code está funcionando corretamente.</p>
              <p className="text-sm mt-2">
                <strong>Tipo de Serviço:</strong> Coleta Conserto (requer QR Code)
              </p>
            </div>
          </CardContent>
        </Card>

        <QRCodeGenerator 
          serviceOrder={testServiceOrder}
          onQRCodeGenerated={() => {
            console.log('✅ QR Code gerado com sucesso no teste!');
            alert('✅ QR Code gerado com sucesso! Verifique se apareceu a etiqueta para impressão.');
          }}
        />

        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-sm text-muted-foreground space-y-2">
              <p><strong>Instruções de Teste:</strong></p>
              <p>1. Clique em "Gerar QR Code" acima</p>
              <p>2. Verifique se o código aparece</p>
              <p>3. Teste os botões de impressão e download</p>
              <p>4. Se funcionar aqui, o problema pode estar no modal</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default QRCodeTest;
