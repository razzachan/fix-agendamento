
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UseFormReturn } from 'react-hook-form';
import { FormValues } from './types';

interface ServiceDetailsSectionProps {
  form: UseFormReturn<FormValues>;
}

const ServiceDetailsSection: React.FC<ServiceDetailsSectionProps> = ({ form }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Detalhes do Serviço</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Este componente estava vazio após remover TechnicianField, 
        podemos adicionar outros campos aqui no futuro se necessário */}
      </CardContent>
    </Card>
  );
};

export default ServiceDetailsSection;
