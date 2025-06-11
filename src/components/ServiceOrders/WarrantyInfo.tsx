import React, { useState, useEffect } from 'react';
import { ServiceOrder } from '@/types';
import { WarrantyService, WarrantyStatus } from '@/types/warranty';
import { warrantyService } from '@/services/warranty/warrantyService';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Shield, ShieldCheck, ShieldOff, Clock, Calendar, FileText, Link2, Settings } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useNavigate } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import WarrantyConfigDialog from './WarrantyConfigDialog';

interface WarrantyInfoProps {
  serviceOrder: ServiceOrder;
  onCreateWarrantyOrder?: (originalOrderId: string) => void;
  onWarrantyUpdated?: (updatedOrder: ServiceOrder) => void;
  canEdit?: boolean;
}

/**
 * Componente que exibe informações detalhadas sobre a garantia de uma ordem de serviço
 */
const WarrantyInfo: React.FC<WarrantyInfoProps> = ({
  serviceOrder,
  onCreateWarrantyOrder,
  onWarrantyUpdated,
  canEdit = false
}) => {
  const [warrantyServices, setWarrantyServices] = useState<WarrantyService[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const navigate = useNavigate();

  // Estado local para o status de garantia
  const [warrantyStatus, setWarrantyStatus] = useState(() =>
    warrantyService.getWarrantyStatus(serviceOrder)
  );

  // Forçar a reavaliação do status de garantia quando as propriedades da ordem mudarem
  useEffect(() => {
    // Recalcular o status de garantia
    const newStatus = warrantyService.getWarrantyStatus(serviceOrder);
    if (newStatus !== warrantyStatus) {
      setWarrantyStatus(newStatus);
    }
  }, [serviceOrder.warrantyPeriod, serviceOrder.warrantyStartDate, serviceOrder.warrantyEndDate, warrantyStatus]);

  // Carregar serviços em garantia relacionados
  useEffect(() => {
    const loadWarrantyServices = async () => {
      if (warrantyStatus === WarrantyStatus.NOT_APPLICABLE) return;

      setIsLoading(true);
      try {
        const services = await warrantyService.getRelatedWarrantyServices(serviceOrder.id);
        setWarrantyServices(services);
      } catch (error) {
        console.error('Erro ao carregar serviços em garantia:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadWarrantyServices();
  }, [serviceOrder.id, warrantyStatus, serviceOrder.warrantyPeriod, serviceOrder.warrantyStartDate, serviceOrder.warrantyEndDate]);

  // Se for um atendimento em garantia, exibe informações sobre a ordem original
  if (warrantyStatus === WarrantyStatus.WARRANTY_SERVICE) {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center">
            <Shield className="h-5 w-5 mr-2 text-blue-600" />
            Atendimento em Garantia
          </CardTitle>
          <CardDescription>
            Este é um atendimento em garantia da ordem #{serviceOrder.relatedWarrantyOrderId}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => navigate(`/orders/${serviceOrder.relatedWarrantyOrderId}`)}
          >
            <Link2 className="h-4 w-4 mr-2" />
            Ver Ordem Original
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Se não tiver garantia, exibe mensagem informativa
  if (warrantyStatus === WarrantyStatus.NOT_APPLICABLE) {
    return (
      <Card className="border-gray-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center">
            <ShieldOff className="h-5 w-5 mr-2 text-gray-500" />
            Sem Informações de Garantia
          </CardTitle>
          <CardDescription>
            Esta ordem de serviço não possui informações de garantia registradas.
          </CardDescription>
        </CardHeader>
        {canEdit && (
          <CardContent>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setIsConfigDialogOpen(true)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Configurar Garantia
            </Button>

            {isConfigDialogOpen && (
              <WarrantyConfigDialog
                isOpen={isConfigDialogOpen}
                onClose={() => setIsConfigDialogOpen(false)}
                serviceOrder={serviceOrder}
                onWarrantyUpdated={onWarrantyUpdated || (() => {})}
              />
            )}
          </CardContent>
        )}
      </Card>
    );
  }

  // Para garantias ativas ou expiradas
  const endDate = new Date(serviceOrder.warrantyEndDate!);
  const startDate = new Date(serviceOrder.warrantyStartDate!);
  const today = new Date();

  // Calcular dias restantes e progresso da garantia
  const totalDays = differenceInDays(endDate, startDate);
  const daysElapsed = differenceInDays(today, startDate);
  const daysRemaining = differenceInDays(endDate, today);

  // Calcular porcentagem de progresso (limitado entre 0 e 100)
  const progressPercentage = Math.max(0, Math.min(100, (daysElapsed / totalDays) * 100));

  return (
    <Card className={warrantyStatus === WarrantyStatus.IN_WARRANTY ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center">
          {warrantyStatus === WarrantyStatus.IN_WARRANTY ? (
            <>
              <ShieldCheck className="h-5 w-5 mr-2 text-green-600" />
              Garantia Ativa
            </>
          ) : (
            <>
              <ShieldOff className="h-5 w-5 mr-2 text-gray-500" />
              Garantia Expirada
            </>
          )}
        </CardTitle>
        <CardDescription>
          {warrantyStatus === WarrantyStatus.IN_WARRANTY
            ? `Garantia válida por mais ${daysRemaining} dias`
            : `Garantia expirada em ${format(endDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-gray-500" />
              <span>Início: {format(startDate, "dd/MM/yyyy", { locale: ptBR })}</span>
            </div>
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-gray-500" />
              <span>Término: {format(endDate, "dd/MM/yyyy", { locale: ptBR })}</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Progresso da Garantia</span>
              <span>{Math.round(progressPercentage)}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>

          {serviceOrder.warrantyTerms && (
            <div className="mt-2">
              <div className="flex items-center text-sm mb-1">
                <FileText className="h-4 w-4 mr-2 text-gray-500" />
                <span className="font-medium">Termos da Garantia</span>
              </div>
              <p className="text-sm text-gray-600">{serviceOrder.warrantyTerms}</p>
            </div>
          )}

          {warrantyServices.length > 0 && (
            <>
              <Separator className="my-2" />
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-gray-500" />
                  Atendimentos em Garantia
                </h4>
                <ul className="space-y-2">
                  {warrantyServices.map(service => (
                    <li key={service.id} className="text-sm">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-0 h-auto text-blue-600 hover:text-blue-800"
                        onClick={() => navigate(`/orders/${service.warrantyOrderId}`)}
                      >
                        Atendimento em {format(new Date(service.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {warrantyStatus === WarrantyStatus.IN_WARRANTY && onCreateWarrantyOrder && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2 w-full"
              onClick={() => onCreateWarrantyOrder(serviceOrder.id)}
            >
              <Shield className="h-4 w-4 mr-2" />
              Criar Atendimento em Garantia
            </Button>
          )}

          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2 w-full"
              onClick={() => setIsConfigDialogOpen(true)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Editar Configurações de Garantia
            </Button>
          )}

          {isConfigDialogOpen && (
            <WarrantyConfigDialog
              isOpen={isConfigDialogOpen}
              onClose={() => setIsConfigDialogOpen(false)}
              serviceOrder={serviceOrder}
              onWarrantyUpdated={onWarrantyUpdated || (() => {})}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default WarrantyInfo;
