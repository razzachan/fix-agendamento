import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const BasicConfirmationPage: React.FC = () => {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Confirmação de Agendamentos</h1>
          <p className="text-muted-foreground">
            Confirme os agendamentos roteirizados com os clientes.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Página Básica de Confirmações</CardTitle>
          <CardDescription>
            Esta é uma versão simplificada da página de confirmações.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>
            Aqui você poderá confirmar os agendamentos roteirizados com os clientes.
            Selecione uma rota para visualizar os agendamentos e confirmar horários.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default BasicConfirmationPage;
