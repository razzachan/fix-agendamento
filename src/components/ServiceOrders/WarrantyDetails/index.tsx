import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ServiceOrder } from '@/types';
import { warrantyService } from '@/services/api';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Shield, ShieldAlert, ShieldCheck, Clock, CalendarDays, FileText, Link2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface WarrantyDetailsProps {
  serviceOrder: ServiceOrder;
  onCreateWarrantyOrder?: (originalOrderId: string, notes: string) => Promise<boolean>;
}

const WarrantyDetails: React.FC<WarrantyDetailsProps> = ({ 
  serviceOrder, 
  onCreateWarrantyOrder 
}) => {
  const [warrantyStatus, setWarrantyStatus] = useState<{ inWarranty: boolean, daysRemaining: number | null } | null>(null);
  const [relatedOrders, setRelatedOrders] = useState<ServiceOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Verificar se a ordem tem garantia configurada
  const hasWarrantyConfig = Boolean(
    serviceOrder.warrantyPeriod && 
    serviceOrder.warrantyStartDate && 
    serviceOrder.warrantyEndDate
  );

  // Verificar se esta é uma ordem em garantia
  const isWarrantyOrder = Boolean(serviceOrder.relatedWarrantyOrderId);

  // Carregar status de garantia e ordens relacionadas
  useEffect(() => {
    const loadWarrantyInfo = async () => {
      if (!serviceOrder.id) return;
      
      setIsLoading(true);
      try {
        // Verificar status de garantia
        if (hasWarrantyConfig) {
          const status = await warrantyService.checkWarrantyStatus(serviceOrder.id);
          setWarrantyStatus(status);
        }
        
        // Carregar ordens relacionadas
        const related = await warrantyService.getRelatedWarrantyOrders(serviceOrder.id);
        setRelatedOrders(related);
      } catch (error) {
        console.error('Erro ao carregar informações de garantia:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadWarrantyInfo();
  }, [serviceOrder.id, hasWarrantyConfig]);

  // Formatar data
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
    } catch (error) {
      return 'Data inválida';
    }
  };

  // Criar uma nova ordem em garantia
  const handleCreateWarrantyOrder = async () => {
    if (!onCreateWarrantyOrder) return;
    
    setIsCreating(true);
    try {
      const success = await onCreateWarrantyOrder(serviceOrder.id, notes);
      
      if (success) {
        toast.success('Ordem de serviço em garantia criada com sucesso!');
        setIsDialogOpen(false);
        setNotes('');
        
        // Recarregar ordens relacionadas
        const related = await warrantyService.getRelatedWarrantyOrders(serviceOrder.id);
        setRelatedOrders(related);
      } else {
        toast.error('Erro ao criar ordem de serviço em garantia.');
      }
    } catch (error) {
      console.error('Erro ao criar ordem em garantia:', error);
      toast.error('Erro ao processar solicitação.');
    } finally {
      setIsCreating(false);
    }
  };

  // Se não houver configuração de garantia, exibir mensagem
  if (!hasWarrantyConfig && !isWarrantyOrder) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="mr-2 h-5 w-5 text-gray-400" />
            Garantia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center text-gray-500">
            <ShieldAlert className="h-12 w-12 mb-2" />
            <p>Esta ordem de serviço não possui garantia configurada.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Se for uma ordem em garantia, exibir informações da ordem original
  if (isWarrantyOrder) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center">
            <ShieldCheck className="mr-2 h-5 w-5 text-green-500" />
            Atendimento em Garantia
          </CardTitle>
          <CardDescription>
            Esta é uma ordem de serviço em garantia
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
            <p className="text-green-800 font-medium">
              Este atendimento está sendo realizado em garantia de um serviço anterior.
            </p>
            <p className="text-sm text-green-700 mt-1">
              Ordem de serviço original: {serviceOrder.relatedWarrantyOrderId}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Exibir detalhes da garantia
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center">
            <Shield className="mr-2 h-5 w-5 text-blue-500" />
            Garantia
          </CardTitle>
          
          {warrantyStatus?.inWarranty && (
            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-400">
              Em Garantia
            </Badge>
          )}
          
          {hasWarrantyConfig && !warrantyStatus?.inWarranty && (
            <Badge variant="outline" className="bg-red-100 text-red-800 border-red-400">
              Garantia Expirada
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <p>Carregando informações de garantia...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2 text-blue-500" />
                <span className="text-sm font-medium">Período:</span>
                <span className="text-sm ml-2">{serviceOrder.warrantyPeriod} meses</span>
              </div>
              
              <div className="flex items-center">
                <CalendarDays className="h-4 w-4 mr-2 text-blue-500" />
                <span className="text-sm font-medium">Início:</span>
                <span className="text-sm ml-2">{formatDate(serviceOrder.warrantyStartDate)}</span>
              </div>
              
              <div className="flex items-center">
                <CalendarDays className="h-4 w-4 mr-2 text-blue-500" />
                <span className="text-sm font-medium">Término:</span>
                <span className="text-sm ml-2">{formatDate(serviceOrder.warrantyEndDate)}</span>
              </div>
              
              {warrantyStatus?.daysRemaining !== null && warrantyStatus?.inWarranty && (
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-green-500" />
                  <span className="text-sm font-medium">Dias restantes:</span>
                  <span className="text-sm ml-2">{warrantyStatus.daysRemaining}</span>
                </div>
              )}
            </div>
            
            {serviceOrder.warrantyTerms && (
              <div className="mb-4">
                <div className="flex items-center mb-1">
                  <FileText className="h-4 w-4 mr-2 text-blue-500" />
                  <span className="text-sm font-medium">Termos da Garantia:</span>
                </div>
                <div className="bg-gray-50 p-3 rounded-md border text-sm">
                  {serviceOrder.warrantyTerms}
                </div>
              </div>
            )}
            
            {/* Ordens relacionadas em garantia */}
            {relatedOrders.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2 flex items-center">
                  <Link2 className="h-4 w-4 mr-2 text-blue-500" />
                  Atendimentos em Garantia:
                </h4>
                <div className="space-y-2">
                  {relatedOrders.map(order => (
                    <div key={order.id} className="bg-blue-50 p-2 rounded-md border border-blue-200 text-sm">
                      <div className="flex justify-between">
                        <span>OS: {order.id}</span>
                        <span>{formatDate(order.createdAt)}</span>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {order.description.substring(0, 100)}
                        {order.description.length > 100 ? '...' : ''}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Botão para criar nova ordem em garantia */}
            {warrantyStatus?.inWarranty && onCreateWarrantyOrder && (
              <div className="mt-4">
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <ShieldCheck className="h-4 w-4 mr-2" />
                      Criar Atendimento em Garantia
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Criar Atendimento em Garantia</DialogTitle>
                      <DialogDescription>
                        Informe o motivo do atendimento em garantia para esta ordem de serviço.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="py-4">
                      <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Descreva o problema e o motivo do atendimento em garantia..."
                        className="min-h-[100px]"
                      />
                    </div>
                    
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button 
                        onClick={handleCreateWarrantyOrder}
                        disabled={isCreating || !notes.trim()}
                      >
                        {isCreating ? 'Criando...' : 'Confirmar'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default WarrantyDetails;
