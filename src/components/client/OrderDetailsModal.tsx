import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Calendar,
  Clock,
  MapPin,
  Package,
  User,
  Phone,
  Mail,
  FileText,
  CheckCircle,
  AlertTriangle,
  Wrench,
  ExternalLink,
  Copy
} from 'lucide-react';
import { ClientOrder } from '@/types/client';
import { toast } from 'sonner';

interface OrderDetailsModalProps {
  order: ClientOrder | null;
  isOpen: boolean;
  onClose: () => void;
}

export function OrderDetailsModal({ order, isOpen, onClose }: OrderDetailsModalProps) {
  if (!order) return null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'in_progress':
      case 'scheduled':
        return <Clock className="h-5 w-5 text-blue-600" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-orange-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado para a área de transferência!`);
  };

  const handleWhatsAppContact = () => {
    const message = encodeURIComponent(
      `Olá! Gostaria de falar sobre a OS #${order.orderNumber} - ${order.equipmentType} ${order.equipmentModel || ''}.`
    );
    window.open(`https://api.whatsapp.com/send?phone=5548988332664&text=${message}`, '_blank');
  };

  const handlePhoneCall = () => {
    window.open('tel:+5548988332664', '_self');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Package className="h-6 w-6 text-[#E5B034]" />
            Detalhes da Ordem de Serviço #{order.orderNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status e Informações Principais */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-xl font-semibold mb-2">{order.equipmentType}</h3>
                  {order.equipmentModel && (
                    <p className="text-gray-600">Modelo: {order.equipmentModel}</p>
                  )}
                  {order.equipmentSerial && (
                    <p className="text-gray-600">Série: {order.equipmentSerial}</p>
                  )}
                </div>
                <Badge className={`${getStatusColor(order.status)} text-lg px-4 py-2`}>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(order.status)}
                    {order.statusLabel}
                  </div>
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Data de Criação</p>
                      <p className="font-medium">{new Date(order.createdAt).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>

                  {order.scheduledDate && (
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Data Agendada</p>
                        <p className="font-medium">{new Date(order.scheduledDate).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Localização Atual</p>
                      <p className="font-medium">{order.locationLabel}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Wrench className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Previsão de Conclusão</p>
                      <p className="font-medium">{order.estimatedCompletion}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Descrição do Problema */}
          {order.description && (
            <Card>
              <CardContent className="p-6">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-[#E5B034]" />
                  Descrição do Problema
                </h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700 leading-relaxed">{order.description}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Informações do Técnico */}
          {order.technician && (
            <Card>
              <CardContent className="p-6">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <User className="h-5 w-5 text-[#E5B034]" />
                  Técnico Responsável
                </h4>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <p className="font-medium">{order.technician.name}</p>
                    {order.technician.phone && (
                      <p className="text-gray-600">{order.technician.phone}</p>
                    )}
                  </div>
                  {order.technician.phone && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(order.technician!.phone, 'Telefone do técnico')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timeline de Progresso */}
          {order.timeline && order.timeline.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-[#E5B034]" />
                  Histórico do Serviço
                </h4>
                <div className="space-y-4">
                  {order.timeline.map((event, index) => (
                    <div key={index} className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-3 h-3 bg-[#E5B034] rounded-full mt-2"></div>
                      <div className="flex-1">
                        <p className="font-medium">{event.description}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(event.date).toLocaleDateString('pt-BR')} às{' '}
                          {new Date(event.date).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Informações de Custo */}
          {order.finalCost && order.finalCost > 0 && (
            <Card>
              <CardContent className="p-6">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-[#E5B034]" />
                  Informações Financeiras
                </h4>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-lg font-semibold text-green-800">
                    Valor Total: R$ {order.finalCost.toFixed(2).replace('.', ',')}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* Ações */}
          <div className="flex flex-col md:flex-row gap-3">
            <Button
              onClick={handleWhatsAppContact}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <Phone className="h-4 w-4 mr-2" />
              Falar no WhatsApp
            </Button>

            <Button
              onClick={handlePhoneCall}
              variant="outline"
              className="flex-1"
            >
              <Phone className="h-4 w-4 mr-2" />
              Ligar Agora
            </Button>

            <Button
              onClick={() => copyToClipboard(order.orderNumber, 'Número da OS')}
              variant="outline"
              className="flex-1"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copiar OS
            </Button>
          </div>

          {/* Informações de Contato */}
          <Card className="bg-[#E5B034]/5 border-[#E5B034]/20">
            <CardContent className="p-6">
              <h4 className="font-semibold mb-3 text-[#E5B034]">Precisa de Ajuda?</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-[#E5B034]" />
                  <span>(48) 98833-2664</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-[#E5B034]" />
                  <span>contato@eletrofix.com.br</span>
                </div>
                <p className="text-gray-600 mt-2">
                  Segunda a Sexta: 08:00 - 18:00 | Sábado: 08:00 - 12:00
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

      </DialogContent>
    </Dialog>
  );
}
