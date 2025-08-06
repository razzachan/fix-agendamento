import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Package, Wrench, CheckCircle, Clock, DollarSign, Calendar, ExternalLink, RefreshCw, ZoomIn } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ServiceOrder } from '@/types';
import { serviceEventService } from '@/services';
import { supabase } from '@/integrations/supabase/client';

interface EquipmentDropdownProps {
  workshopOrders: ServiceOrder[];
  diagnosisCompletedIds: string[];
  onAddDiagnosis: (orderId: string) => void;
  onUpdateProgress: (orderId: string) => void;
  onCompleteRepair: (orderId: string) => void;
  isLoadingDiagnosis: boolean;
}

const EquipmentDropdown: React.FC<EquipmentDropdownProps> = ({
  workshopOrders,
  diagnosisCompletedIds,
  onAddDiagnosis,
  onUpdateProgress,
  onCompleteRepair,
  isLoadingDiagnosis
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [diagnosisData, setDiagnosisData] = useState<Record<string, any>>({});
  const [progressData, setProgressData] = useState<Record<string, any>>({});
  const [loadingDetails, setLoadingDetails] = useState<Record<string, boolean>>({});
  const [equipmentImages, setEquipmentImages] = useState<Record<string, string>>({});

  // Estados para o modal de visualização de foto
  const [selectedImage, setSelectedImage] = useState<{url: string, title: string} | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);

  // Carregar detalhes dos diagnósticos e progresso quando o dropdown abrir
  useEffect(() => {
    if (isOpen && workshopOrders.length > 0) {
      console.log('🔄 [EquipmentDropdown] Dropdown aberto, carregando dados...');
      loadEquipmentDetails();
      loadEquipmentImages();
    }
  }, [isOpen, workshopOrders]);

  // Recarregar dados quando houver mudanças nos workshopOrders (após atualizações)
  useEffect(() => {
    if (isOpen) {
      console.log('🔄 [EquipmentDropdown] WorkshopOrders atualizados, recarregando dados...');
      loadEquipmentDetails();
    }
  }, [workshopOrders]);

  const loadEquipmentDetails = async () => {
    const newDiagnosisData: Record<string, any> = {};
    const newProgressData: Record<string, any> = {};
    const newLoadingDetails: Record<string, boolean> = {};

    for (const order of workshopOrders) {
      newLoadingDetails[order.id] = true;

      try {
        // Carregar diagnóstico se existir
        if (diagnosisCompletedIds.includes(order.id)) {
          const diagnosisEvents = await serviceEventService.getDiagnosisEvents(order.id);
          if (diagnosisEvents && diagnosisEvents.length > 0) {
            newDiagnosisData[order.id] = diagnosisEvents[0];
          }
        }

        // Carregar progresso do reparo se existir
        console.log(`🔧 [EquipmentDropdown] Buscando progresso do reparo para ${order.client_name || order.clientName} (${order.id})`);
        const progressEvents = await serviceEventService.getRepairProgressEvents(order.id);
        console.log(`🔧 [EquipmentDropdown] Progresso encontrado para ${order.client_name || order.clientName}:`, progressEvents);
        if (progressEvents && progressEvents.length > 0) {
          newProgressData[order.id] = progressEvents;
          console.log(`✅ [EquipmentDropdown] Progresso salvo para ${order.client_name || order.clientName}:`, progressEvents.length, 'eventos');
        }
      } catch (error) {
        console.error(`Erro ao carregar detalhes para OS ${order.id}:`, error);
      } finally {
        newLoadingDetails[order.id] = false;
      }
    }

    setDiagnosisData(newDiagnosisData);
    setProgressData(newProgressData);
    setLoadingDetails(newLoadingDetails);
  };

  // Função para carregar fotos dos equipamentos
  const loadEquipmentImages = async () => {
    try {
      const orderIds = workshopOrders.map(order => order.id);

      console.log('🖼️ [EquipmentDropdown] Carregando fotos para ordens:', orderIds);

      const { data: images, error } = await supabase
        .from('service_order_images')
        .select('service_order_id, url')
        .in('service_order_id', orderIds)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Erro ao carregar fotos:', error);
        return;
      }

      // Criar mapa com a primeira foto de cada ordem
      const imageMap: Record<string, string> = {};
      images?.forEach(image => {
        if (!imageMap[image.service_order_id]) {
          imageMap[image.service_order_id] = image.url;
        }
      });

      console.log('🖼️ [EquipmentDropdown] Fotos carregadas:', imageMap);
      setEquipmentImages(imageMap);
    } catch (error) {
      console.error('❌ Erro ao carregar fotos dos equipamentos:', error);
    }
  };

  // Função para abrir modal de visualização de foto
  const handleImageClick = (imageUrl: string, equipmentType: string, clientName: string) => {
    setSelectedImage({
      url: imageUrl,
      title: `${equipmentType} - ${clientName}`
    });
    setShowImageModal(true);
  };

  // Função para fechar modal de foto
  const handleCloseImageModal = () => {
    setShowImageModal(false);
    setSelectedImage(null);
  };

  // Agrupar equipamentos por status
  const pendingDiagnosis = workshopOrders.filter(order => {
    // APENAS equipamentos que foram CONFIRMADOS como recebidos na oficina
    const isReceivedAtWorkshop = (order.status === 'received_at_workshop' || order.status === 'collected');
    const needsDiagnosis = !diagnosisCompletedIds.includes(order.id);

    // APENAS coleta_diagnostico precisa de diagnóstico
    // coleta_conserto vai direto para reparo (problema conhecido)
    const needsDiagnosisStep = order.serviceAttendanceType === 'coleta_diagnostico';

    console.log(`🔍 [EquipmentDropdown] Verificando diagnóstico ${order.clientName || order.client_name}:`, {
      status: order.status,
      type: order.serviceAttendanceType,
      isReceivedAtWorkshop,
      needsDiagnosis,
      needsDiagnosisStep,
      shouldShow: isReceivedAtWorkshop && needsDiagnosis && needsDiagnosisStep
    });

    return isReceivedAtWorkshop && needsDiagnosis && needsDiagnosisStep;
  });

  // Equipamentos aguardando aprovação de orçamento (APENAS coleta_diagnostico)
  const awaitingQuoteApproval = workshopOrders.filter(order => {
    const isAwaitingApproval = order.status === 'quote_sent' || order.status === 'diagnosis_completed';
    const needsApprovalStep = order.serviceAttendanceType === 'coleta_diagnostico';

    console.log(`🔍 [EquipmentDropdown] Verificando aprovação ${order.client_name || order.clientName}:`, {
      status: order.status,
      type: order.serviceAttendanceType,
      isAwaitingApproval,
      needsApprovalStep,
      shouldShow: isAwaitingApproval && needsApprovalStep
    });

    return isAwaitingApproval && needsApprovalStep;
  });

  // Equipamentos em progresso: APENAS após aprovação OU coleta_conserto direto
  const inProgress = workshopOrders.filter(order => {
    // Equipamentos em progresso: APENAS orçamento aprovado ou em reparo (NÃO awaiting_quote_approval)
    const isInProgressStatus = order.status === 'in_progress' || order.status === 'quote_approved';

    // coleta_conserto vai direto para reparo após recebimento
    const isColetaConsertoReady = order.serviceAttendanceType === 'coleta_conserto' &&
                                 (order.status === 'received_at_workshop' || order.status === 'collected');

    console.log(`🔍 [EquipmentDropdown] Verificando progresso ${order.client_name || order.clientName}:`, {
      status: order.status,
      type: order.serviceAttendanceType,
      isInProgressStatus,
      isColetaConsertoReady,
      shouldShow: isInProgressStatus || isColetaConsertoReady
    });

    return isInProgressStatus || isColetaConsertoReady;
  });

  const readyForDelivery = workshopOrders.filter(order =>
    order.status === 'ready_for_delivery' ||
    order.status === 'collected_for_delivery' ||
    order.status === 'payment_pending'
  );

  // Contar todos os equipamentos únicos (evitar duplicatas)
  const allEquipmentIds = new Set([
    ...pendingDiagnosis.map(o => o.id),
    ...awaitingQuoteApproval.map(o => o.id),
    ...inProgress.map(o => o.id),
    ...readyForDelivery.map(o => o.id)
  ]);
  const totalEquipments = allEquipmentIds.size;

  // Log para debug da contagem
  console.log('📊 [EquipmentDropdown] Contagem de equipamentos:', {
    pendingDiagnosis: pendingDiagnosis.length,
    awaitingQuoteApproval: awaitingQuoteApproval.length,
    inProgress: inProgress.length,
    readyForDelivery: readyForDelivery.length,
    totalWorkshopOrders: workshopOrders.length,
    totalEquipments: totalEquipments,
    allIds: Array.from(allEquipmentIds)
  });

  const getStatusIcon = (order: ServiceOrder) => {
    if (readyForDelivery.includes(order)) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    if (inProgress.includes(order)) {
      return <Wrench className="h-4 w-4 text-blue-500" />;
    }
    if (awaitingQuoteApproval.includes(order)) {
      return <DollarSign className="h-4 w-4 text-yellow-500" />;
    }
    return <Clock className="h-4 w-4 text-orange-500" />;
  };

  const getStatusText = (order: ServiceOrder) => {
    if (readyForDelivery.includes(order)) {
      return 'Pronto para Entrega';
    }
    if (inProgress.includes(order)) {
      // Mostrar status real baseado no status da ordem
      if (order.status === 'quote_approved') {
        return 'Orçamento Aprovado';
      }
      if (order.status === 'in_progress') {
        return 'Em Reparo';
      }
      // Para coleta_conserto direto
      if (order.serviceAttendanceType === 'coleta_conserto') {
        return 'Pronto para Reparo';
      }
      return 'Em Trabalho';
    }
    if (awaitingQuoteApproval.includes(order)) {
      return 'Aguardando Aprovação do Orçamento';
    }
    return 'Aguardando Diagnóstico';
  };

  const getStatusColor = (order: ServiceOrder) => {
    if (readyForDelivery.includes(order)) {
      return 'bg-green-50 border-green-200';
    }
    if (inProgress.includes(order)) {
      return 'bg-blue-50 border-blue-200';
    }
    if (awaitingQuoteApproval.includes(order)) {
      return 'bg-yellow-50 border-yellow-200';
    }
    return 'bg-orange-50 border-orange-200';
  };

  return (
    <>
    <Card className="w-full">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-gray-600" />
                <span>Equipamentos na Oficina ({totalEquipments})</span>
              </div>
              {isOpen ? (
                <ChevronUp className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              )}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            {workshopOrders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>Nenhum equipamento na oficina</p>
              </div>
            ) : (
              <div className="space-y-4">
                {workshopOrders.map((order) => {
                  const diagnosis = diagnosisData[order.id];
                  const progress = progressData[order.id];
                  const isLoadingOrderDetails = loadingDetails[order.id];

                  return (
                    <div
                      key={order.id}
                      className={`p-6 rounded-lg border-2 ${getStatusColor(order)} transition-all hover:shadow-md`}
                    >
                      {/* Header do equipamento */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-3">
                            {getStatusIcon(order)}
                            <h4 className="font-semibold text-gray-800 text-lg">
                              {order.client_name || order.clientName}
                            </h4>
                            <span className="text-xs px-2 py-1 rounded-full bg-white border text-gray-600">
                              {getStatusText(order)}
                            </span>
                          </div>

                          {/* Informações do equipamento */}
                          <div className="space-y-2 mb-3">
                            <p className="text-sm text-gray-600 font-medium">
                              {order.equipment_type || order.equipmentType}
                            </p>

                            {(order.equipment_model || order.equipmentModel) && (
                              <p className="text-xs text-gray-500">
                                Modelo: {order.equipment_model || order.equipmentModel}
                              </p>
                            )}

                            {/* Tipo de Serviço */}
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-gray-600">Tipo:</span>
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                order.serviceAttendanceType === 'coleta_diagnostico'
                                  ? 'bg-orange-100 text-orange-700 border border-orange-200'
                                  : order.serviceAttendanceType === 'coleta_conserto'
                                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                  : 'bg-green-100 text-green-700 border border-green-200'
                              }`}>
                                {order.serviceAttendanceType === 'coleta_diagnostico' && '🔍 Coleta Diagnóstico'}
                                {order.serviceAttendanceType === 'coleta_conserto' && '🔧 Coleta Conserto'}
                                {order.serviceAttendanceType === 'em_domicilio' && '🏠 Em Domicílio'}
                              </span>
                            </div>

                            {/* Problema do equipamento */}
                            {order.description && (
                              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                <div className="flex items-center gap-1 mb-1">
                                  <span className="text-xs font-medium text-gray-600">Problema:</span>
                                </div>
                                <p className="text-xs text-gray-700 leading-relaxed">
                                  {order.description.split('\n').map((line, index) => (
                                    <span key={index}>
                                      {line.trim()}
                                      {index < order.description.split('\n').length - 1 && <br />}
                                    </span>
                                  ))}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Área da foto e botões */}
                        <div className="flex flex-col gap-3 ml-4">
                          {/* Foto do equipamento */}
                          <div
                            className={`w-20 h-20 bg-gray-100 rounded-xl border-2 border-gray-200 flex items-center justify-center overflow-hidden relative group ${
                              equipmentImages[order.id] ? 'cursor-pointer hover:border-blue-300 transition-all duration-200' : ''
                            }`}
                            onClick={() => equipmentImages[order.id] && handleImageClick(
                              equipmentImages[order.id],
                              order.equipment_type || order.equipmentType || 'Equipamento',
                              order.client_name || order.clientName || 'Cliente'
                            )}
                          >
                            {equipmentImages[order.id] ? (
                              <>
                                <img
                                  src={equipmentImages[order.id]}
                                  alt={`${order.equipment_type || order.equipmentType}`}
                                  className="w-full h-full object-cover rounded-lg transition-transform duration-200 group-hover:scale-105"
                                  onError={(e) => {
                                    console.error('❌ Erro ao carregar imagem:', equipmentImages[order.id]);
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                  }}
                                />
                                {/* Overlay com ícone de zoom */}
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center rounded-lg">
                                  <ZoomIn className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                                </div>
                              </>
                            ) : (
                              <Package className="h-8 w-8 text-gray-400" />
                            )}
                          </div>

                          {/* Botões de ação */}
                          <div className="flex flex-col gap-2">
                          {pendingDiagnosis.includes(order) && (
                            <Button
                              size="sm"
                              onClick={() => onAddDiagnosis(order.id)}
                              disabled={isLoadingDiagnosis}
                              className="text-xs"
                            >
                              <Clock className="h-3 w-3 mr-1" />
                              Adicionar Diagnóstico
                            </Button>
                          )}

                          {awaitingQuoteApproval.includes(order) && (
                            <div className="text-xs text-yellow-600 bg-yellow-50 px-3 py-2 rounded-lg border border-yellow-200">
                              <div className="flex items-center gap-1 mb-1">
                                <DollarSign className="h-3 w-3" />
                                <span className="font-medium">Aguardando Aprovação</span>
                              </div>
                              <p className="text-yellow-700">
                                Orçamento enviado para aprovação do administrador
                              </p>
                            </div>
                          )}

                          {inProgress.includes(order) && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onUpdateProgress(order.id)}
                                className="text-xs"
                              >
                                <Wrench className="h-3 w-3 mr-1" />
                                Atualizar Progresso
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => onCompleteRepair(order.id)}
                                className="text-xs"
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Concluir Reparo
                              </Button>
                            </>
                          )}
                          </div>
                        </div>
                      </div>

                      {/* Detalhes do Diagnóstico */}
                      {isLoadingOrderDetails ? (
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2 text-gray-500">
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            <span className="text-sm">Carregando detalhes...</span>
                          </div>
                        </div>
                      ) : diagnosis ? (
                        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-center gap-2 mb-3">
                            <Wrench className="h-4 w-4 text-blue-600" />
                            <h5 className="font-semibold text-blue-800">Diagnóstico Técnico</h5>
                          </div>

                          <p className="text-sm text-gray-700 mb-3">
                            {diagnosis.technical_diagnosis || diagnosis.technicalDiagnosis}
                          </p>

                          {diagnosis.recommended_service && (
                            <div className="mb-3">
                              <span className="text-xs font-medium text-gray-600">Serviço Recomendado:</span>
                              <p className="text-sm text-gray-700">{diagnosis.recommended_service}</p>
                            </div>
                          )}

                          <div className="flex flex-wrap gap-4 text-xs text-gray-600">
                            {diagnosis.estimated_cost && (
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3 text-green-600" />
                                <span>Custo estimado: R$ {diagnosis.estimated_cost}</span>
                              </div>
                            )}

                            {diagnosis.completion_forecast && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-orange-600" />
                                <span>Previsão: {new Date(diagnosis.completion_forecast).toLocaleDateString()}</span>
                              </div>
                            )}

                            {diagnosis.parts_link && (
                              <a
                                href={diagnosis.parts_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                              >
                                <ExternalLink className="h-3 w-3" />
                                <span>Link para peças</span>
                              </a>
                            )}
                          </div>

                          <p className="text-xs text-gray-500 mt-2">
                            Diagnóstico registrado em {new Date(diagnosis.created_at).toLocaleString()}
                          </p>
                        </div>
                      ) : null}

                      {/* Progresso do Reparo */}
                      {progress && progress.length > 0 && (
                        <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                          <div className="flex items-center gap-2 mb-3">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <h5 className="font-semibold text-green-800">Progresso do Reparo</h5>
                          </div>

                          <div className="space-y-2">
                            {progress.map((event: any, index: number) => (
                              <div key={index} className="flex items-start gap-2 text-sm">
                                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                                <div className="flex-1">
                                  <p className="text-gray-700">{event.progress_description}</p>
                                  <p className="text-xs text-gray-500">
                                    {new Date(event.created_at).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Status especiais */}
                      {readyForDelivery.includes(order) && (
                        <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-purple-600" />
                            <span className="font-semibold text-purple-800">Pronto para Entrega</span>
                          </div>
                          <p className="text-sm text-purple-700 mt-1">
                            Reparo concluído. Equipamento pronto para entrega.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>

    {/* Modal de visualização expandida da foto */}
    <Dialog open={showImageModal} onOpenChange={setShowImageModal}>
      <DialogContent className="max-w-4xl w-full h-[80vh] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-gray-600" />
            <span>{selectedImage?.title}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex items-center justify-center p-6 pt-2">
          {selectedImage && (
            <div className="relative w-full h-full flex items-center justify-center">
              <img
                src={selectedImage.url}
                alt={selectedImage.title}
                className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                style={{ maxHeight: 'calc(80vh - 120px)' }}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default EquipmentDropdown;
