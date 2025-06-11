
import React from 'react';
import { Button } from '@/components/ui/button';
import { useFormContext } from 'react-hook-form';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface FormActionsProps {
  onCancel: () => void;
}

const FormActions: React.FC<FormActionsProps> = ({ onCancel }) => {
  const { watch } = useFormContext();
  const clientEmail = watch('clientEmail');

  return (
    <div className="flex justify-between items-center pt-4">
      <div className="text-sm text-muted-foreground">
        {clientEmail && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger className="flex items-center gap-1 text-primary">
                <Info className="h-4 w-4" />
                <span>Conta de cliente será criada</span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Uma conta será criada para o cliente usando o email <strong>{clientEmail}</strong> como login e senha padrão <strong>123456</strong></p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <div className="flex space-x-2">
        <Button variant="outline" type="button" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">
          Criar Ordem de Serviço
        </Button>
      </div>
    </div>
  );
};

export default FormActions;
