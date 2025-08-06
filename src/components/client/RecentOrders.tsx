import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Package,
  Clock,
  MapPin,
  Calendar,
  ArrowRight,
  Wrench,
  CheckCircle,
  AlertTriangle,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  FileText
} from 'lucide-react';
import { ClientOrder } from '@/hooks/client/useClientOrders';
import { ClientStatusBadge } from './ClientStatusBadge';
import { ServiceOrderProgressHistory } from '@/components/ServiceOrders/ProgressHistory/ServiceOrderProgressHistory';
import { toast } from 'sonner';
import { clientQuoteService } from '@/services/client/clientQuoteService';
import { useAuth } from '@/contexts/AuthContext';
import QuoteApprovalCard from './QuoteApprovalCard';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface RecentOrdersProps {
  orders: ClientOrder[];
}

export function RecentOrders({ orders }: RecentOrdersProps) {
  // Mostrar apenas as 5 ordens mais recentes
  const recentOrders = orders.slice(0, 5);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuth();

  // Debug: Log das ordens recebidas
  console.log('🔍 [RecentOrders] Ordens recebidas:', orders.length);
  if (orders.length > 0) {
    console.log('🔍 [RecentOrders] Primeira ordem:', {
      id: orders[0].id,
      status: orders[0].status,
      statusLabel: orders[0].statusLabel,
      orderNumber: orders[0].orderNumber
    });
  }

  const toggleExpanded = (orderId: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };

  // Dados do orçamento baseados nos valores reais do banco e tipo de atendimento
  const getQuoteData = (order: ClientOrder) => {
    const initialCost = order.initialCost || 0;
    const estimatedCost = order.diagnosis?.estimatedCost || 0;

    console.log('🔍 [RecentOrders] Dados da ordem:', {
      id: order.id,
      serviceAttendanceType: order.serviceAttendanceType,
      initialCost,
      estimatedCost,
      diagnosis: order.diagnosis
    });

    // Lógica baseada no tipo de atendimento
    switch (order.serviceAttendanceType) {
      case 'em_domicilio':
        // Em domicílio: initial_cost (pagamento único)
        return {
          finalAmount: initialCost,
          description: "Serviço em domicílio - pagamento único.",
          details: [
            {
              item: "Valor do serviço",
              value: initialCost,
              note: "Pagamento único no local",
              type: "total"
            }
          ]
        };

      case 'coleta_conserto':
        // Coleta conserto: initial_cost/2 (coleta) + initial_cost/2 (entrega)
        const halfValue = initialCost / 2;
        return {
          finalAmount: initialCost,
          firstPayment: halfValue,
          secondPayment: halfValue,
          description: "Coleta para conserto - pagamento dividido em duas partes.",
          details: [
            {
              item: "Primeira parcela (coleta)",
              value: halfValue,
              note: "Já pago na coleta",
              type: "paid"
            },
            {
              item: "Segunda parcela (entrega)",
              value: halfValue,
              note: "A pagar na entrega",
              type: "total"
            }
          ]
        };

      case 'coleta_diagnostico':
        // Coleta diagnóstico: mostrar valores claros com desconto explícito
        const totalServiceValue = order.final_cost || (initialCost + estimatedCost); // Valor total do serviço
        const diagnosticValue = initialCost; // Valor da coleta diagnóstico (R$ 350,00)
        const repairValue = estimatedCost; // Valor do reparo/peças (R$ 878,00)
        const finalAmount = estimatedCost; // Valor final a pagar (R$ 878,00)
        const serviceName = order.diagnosis?.recommendedService || "Reparo e peças";

        return {
          diagnosticFee: diagnosticValue,
          partsValue: repairValue,
          totalServiceValue: totalServiceValue,
          finalAmount: finalAmount,
          serviceName: serviceName,
          description: order.diagnosis?.description || "Aguardando diagnóstico técnico detalhado.",
          recommendedService: order.diagnosis?.recommendedService || "Aguardando recomendação de serviço.",
          details: [
            {
              item: "💰 Valor total do serviço",
              value: totalServiceValue,
              note: `Valor completo: coleta + ${serviceName.toLowerCase()}`,
              type: "info"
            },
            {
              item: "✅ Coleta para diagnóstico",
              value: diagnosticValue,
              note: "Já pago na coleta - Inclui diagnóstico e mão de obra",
              type: "paid"
            },
            {
              item: `🔧 ${serviceName}`,
              value: repairValue,
              note: "Valor das peças e serviços necessários",
              type: "service"
            },
            {
              item: "➖ Desconto (coleta já paga)",
              value: -diagnosticValue,
              note: "Desconto do valor já pago na coleta",
              type: "discount"
            },
            {
              item: "🎯 Valor a pagar na entrega",
              value: finalAmount,
              note: `R$ ${totalServiceValue.toFixed(2)} - R$ ${diagnosticValue.toFixed(2)} = R$ ${finalAmount.toFixed(2)}`,
              type: "total"
            }
          ]
        };

      default:
        return {
          finalAmount: initialCost || estimatedCost,
          description: "Aguardando detalhes do orçamento.",
          details: []
        };
    }
  };

  const handleQuoteApproval = async (orderId: string, approved: boolean) => {
    if (!user?.id) {
      toast.error('Erro: usuário não identificado.');
      return;
    }

    setIsProcessing(true);
    try {
      let success = false;

      if (approved) {
        success = await clientQuoteService.approveQuote(orderId, user.id);
        if (success) {
          toast.success('Orçamento aprovado com sucesso! Iniciaremos o reparo em breve.');
        }
      } else {
        success = await clientQuoteService.rejectQuote(orderId, user.id, 'Cliente rejeitou o orçamento via portal web');
        if (success) {
          toast.success('Orçamento rejeitado. Entraremos em contato para discutir outras opções.');
        }
      }

      // Recarregar a página para atualizar os dados
      if (success) {
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }

    } catch (error) {
      console.error('Erro ao processar orçamento:', error);
      toast.error('Erro ao processar resposta do orçamento. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in_progress':
      case 'at_workshop':
      case 'received_at_workshop':
        return <Wrench className="h-4 w-4 text-blue-600" />;
      case 'awaiting_quote_approval':
      case 'quote_sent':
      case 'awaiting_approval':
      case 'diagnosis_completed':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'scheduled':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'on_the_way':
        return <Package className="h-4 w-4 text-cyan-600" />;
      case 'collected':
      case 'collected_for_diagnosis':
        return <Package className="h-4 w-4 text-teal-600" />;
      case 'ready_for_delivery':
        return <CheckCircle className="h-4 w-4 text-emerald-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  if (orders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5 text-green-600" />
            <span>Seus Equipamentos</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Package className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum equipamento encontrado
            </h3>
            <p className="text-gray-600 mb-6">
              Você ainda não possui equipamentos em nosso sistema.
            </p>
            <Button 
              onClick={() => {
                const message = encodeURIComponent(
                  'Olá! Gostaria de solicitar um serviço para meu equipamento.'
                );
                window.open(`https://api.whatsapp.com/send?phone=5548988332664&text=${message}`, '_blank');
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              Solicitar Primeiro Serviço
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5 text-green-600" />
            <span>Seus Equipamentos</span>
            <Badge variant="secondary" className="ml-2">
              {orders.length} {orders.length === 1 ? 'equipamento' : 'equipamentos'}
            </Badge>
          </CardTitle>
          {orders.length > 5 && (
            <Button variant="outline" size="sm">
              Ver Todos
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentOrders.map((order) => {
            const isExpanded = expandedOrders.has(order.id);

            return (
              <div
                key={order.id}
                className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-lg overflow-hidden">
                        {order.images && order.images.length > 0 ? (
                          <img
                            src={order.images[0].url}
                            alt="Equipamento"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          getStatusIcon(order.status)
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-gray-900">
                            OS {order.orderNumber}
                          </h4>
                          <ClientStatusBadge status={order.status} />
                        </div>
                        <p className="text-sm text-gray-600">
                          {order.equipmentType} {order.equipmentBrand && `- ${order.equipmentBrand}`}
                        </p>
                        {order.equipmentModel && (
                          <p className="text-xs text-gray-500">
                            Modelo: {order.equipmentModel}
                          </p>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpanded(order.id)}
                      className="ml-2"
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div className="flex items-center space-x-2 text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>Criado: {formatDate(order.createdAt)}</span>
                </div>
                
                {order.scheduledDate && (
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Clock className="h-4 w-4" />
                    <span>Agendado: {formatDate(order.scheduledDate)}</span>
                  </div>
                )}

                {order.currentLocation && (
                  <div className="flex items-center space-x-2 text-gray-600">
                    <MapPin className="h-4 w-4" />
                    <span>{order.locationLabel || order.currentLocation}</span>
                  </div>
                )}
              </div>

              {order.description && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <strong>Problema:</strong> {order.description}
                  </p>
                </div>
              )}

              {order.technician && (
                <div className="mt-3">
                  <div className="text-sm text-gray-600">
                    <strong>Técnico:</strong> {order.technician.name}
                  </div>
                </div>
              )}

              {order.estimatedCompletion && (
                <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Previsão de conclusão:</strong> {order.estimatedCompletion}
                  </p>
                </div>
              )}

              {/* Seção de Orçamento - Apenas quando aguardando aprovação */}
              {order.status === 'awaiting_quote_approval' && (
                <div className="mt-4 p-4 border-2 border-orange-200 bg-orange-50 rounded-lg">
                  <h4 className="font-semibold mb-3 flex items-center gap-2 text-orange-800">
                    <FileText className="h-5 w-5 text-orange-600" />
                    Orçamento Aguardando Aprovação
                  </h4>

                  {(() => {
                    const quoteData = getQuoteData(order);
                    return (
                      <>
                        {/* Diagnóstico e Solução */}
                        <div className="mb-4 p-3 bg-white rounded border">
                          <h5 className="font-medium mb-2 text-sm">Diagnóstico e Solução:</h5>
                          <div className="space-y-2 text-xs">
                            <div>
                              <p className="font-medium text-gray-800">Diagnóstico:</p>
                              <p className="text-gray-700 leading-relaxed">
                                {quoteData.description}
                              </p>
                            </div>
                            <div>
                              <p className="font-medium text-gray-800">Serviço Recomendado:</p>
                              <p className="text-gray-700 leading-relaxed">
                                {quoteData.recommendedService}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Detalhamento dos custos */}
                        <div className="mb-4">
                          <h5 className="font-medium mb-2 text-sm">Detalhamento dos Custos:</h5>
                          <div className="space-y-2">
                            {quoteData.details.map((detail, index) => {
                              // Definir cores e estilos baseados no tipo
                              let bgColor = "bg-white";
                              let textColor = "text-gray-800";
                              let valueColor = "text-gray-800";
                              let icon = "";

                              switch (detail.type) {
                                case 'paid':
                                  bgColor = "bg-green-50 border-green-200";
                                  textColor = "text-green-800";
                                  valueColor = "text-green-700";
                                  icon = "✅";
                                  break;
                                case 'service':
                                  bgColor = "bg-blue-50 border-blue-200";
                                  textColor = "text-blue-800";
                                  valueColor = "text-blue-700";
                                  icon = "🔧";
                                  break;
                                case 'discount':
                                  bgColor = "bg-orange-50 border-orange-200";
                                  textColor = "text-orange-800";
                                  valueColor = "text-orange-700";
                                  icon = "💰";
                                  break;
                                case 'total':
                                  bgColor = "bg-purple-50 border-purple-200";
                                  textColor = "text-purple-800";
                                  valueColor = "text-purple-700 font-bold";
                                  icon = "💳";
                                  break;
                              }

                              return (
                                <div key={index} className={`flex justify-between items-center p-3 rounded border text-xs ${bgColor}`}>
                                  <div className="flex-1">
                                    <p className={`font-medium flex items-center gap-2 ${textColor}`}>
                                      <span>{icon}</span>
                                      {detail.item}
                                    </p>
                                    <p className="text-gray-600 mt-1">{detail.note}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className={`font-semibold ${valueColor}`}>
                                      {detail.value < 0 ? '-' : ''}R$ {Math.abs(detail.value).toFixed(2).replace('.', ',')}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Total */}
                        <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border-2 border-purple-200">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-semibold text-purple-800 text-sm flex items-center gap-2">
                                💳 Valor Total do Orçamento:
                              </p>
                              <p className="text-xs text-purple-600 mt-1">
                                R$ {quoteData.diagnosticFee.toFixed(2).replace('.', ',')} (coleta) + R$ {quoteData.partsValue.toFixed(2).replace('.', ',')} (reparo) - R$ {quoteData.diagnosticFee.toFixed(2).replace('.', ',')} (desconto) = R$ {quoteData.finalAmount.toFixed(2).replace('.', ',')}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-purple-800">
                                R$ {quoteData.finalAmount.toFixed(2).replace('.', ',')}
                              </p>
                              <p className="text-xs text-purple-600">
                                (coleta R$ {quoteData.diagnosticFee.toFixed(2).replace('.', ',')} já paga)
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Botões de Ação */}
                        <div className="flex flex-col sm:flex-row gap-2">
                          {/* Botão Aprovar */}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                className="flex-1 bg-green-600 hover:bg-green-700 text-sm"
                                disabled={isProcessing}
                                size="sm"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Aprovar Orçamento
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar Aprovação do Orçamento</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Você está aprovando o orçamento de <strong>R$ {quoteData.finalAmount.toFixed(2).replace('.', ',')}</strong> para o reparo do seu equipamento.
                                  <br /><br />
                                  Após a aprovação, iniciaremos o reparo imediatamente e você será notificado sobre o progresso.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleQuoteApproval(order.id, true)}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  Sim, Aprovar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>

                          {/* Botão Rejeitar */}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                className="flex-1 border-red-300 text-red-600 hover:bg-red-50 text-sm"
                                disabled={isProcessing}
                                size="sm"
                              >
                                <AlertTriangle className="h-4 w-4 mr-2" />
                                Rejeitar
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Rejeitar Orçamento</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Você está rejeitando o orçamento apresentado.
                                  <br /><br />
                                  Nossa equipe entrará em contato com você para discutir outras opções ou esclarecer dúvidas sobre o orçamento.
                                  <br /><br />
                                  Deseja realmente rejeitar este orçamento?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleQuoteApproval(order.id, false)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Sim, Rejeitar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>

                        {/* Informação adicional */}
                        <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-200">
                          <p className="text-xs text-blue-800">
                            <strong>Dúvidas?</strong> Entre em contato conosco pelo WhatsApp ou telefone para esclarecer qualquer questão sobre o orçamento.
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

                {/* Seção expansível com histórico */}
                {isExpanded && (
                  <div className="border-t bg-gray-50">
                    <div className="p-4 space-y-4">
                      {/* Histórico da OS usando componente reutilizável */}
                      <ServiceOrderProgressHistory
                        serviceOrderId={order.id}
                        currentStatus={order.status}
                        showActions={false}
                        title="Histórico do Equipamento"
                      />

                      {/* Galeria de imagens */}
                      {order.images && order.images.length > 1 && (
                        <div>
                          <h5 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                            <ImageIcon className="h-4 w-4" />
                            Fotos do Equipamento ({order.images.length})
                          </h5>
                          <div className="grid grid-cols-3 gap-2">
                            {order.images.slice(1).map((image, index) => (
                              <img
                                key={index}
                                src={image.url}
                                alt={`Equipamento ${index + 2}`}
                                className="w-full h-20 object-cover rounded-lg border hover:opacity-75 transition-opacity cursor-pointer"
                                onClick={() => window.open(image.url, '_blank')}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {orders.length > 5 && (
          <div className="mt-6 text-center">
            <Button variant="outline" className="w-full">
              Ver Todos os Equipamentos ({orders.length})
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
