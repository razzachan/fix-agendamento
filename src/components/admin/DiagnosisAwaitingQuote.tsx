import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Stethoscope, DollarSign, Clock, RefreshCw, FileText } from 'lucide-react';
import { quoteService } from '@/services/admin/quoteService';
import { QuoteCreationDialog } from './QuoteCreationDialog';
import { toast } from 'sonner';

interface DiagnosisItem {
  id: string;
  client_name: string;
  equipment_type: string;
  equipment_model?: string;
  service_attendance_type: string;
  created_at: string;
  diagnosis: {
    diagnosis_details: string;
    recommended_service: string;
    estimated_cost: number;
    estimated_completion_date: string;
    parts_purchase_link?: string;
  };
  diagnosisDate: string;
}

export function DiagnosisAwaitingQuote() {
  const [diagnosisList, setDiagnosisList] = useState<DiagnosisItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<DiagnosisItem | null>(null);
  const [showQuoteDialog, setShowQuoteDialog] = useState(false);

  const loadDiagnosisAwaitingQuote = async () => {
    setIsLoading(true);
    try {
      const diagnosis = await quoteService.getDiagnosisAwaitingQuote();
      setDiagnosisList(diagnosis);
      
      if (diagnosis.length === 0) {
        console.log('Nenhum diagnóstico aguardando orçamento');
      }
    } catch (error) {
      console.error('Erro ao carregar diagnósticos:', error);
      toast.error('Erro ao carregar diagnósticos aguardando orçamento.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDiagnosisAwaitingQuote();
  }, []);

  const handleCreateQuote = (diagnosis: DiagnosisItem) => {
    setSelectedDiagnosis(diagnosis);
    setShowQuoteDialog(true);
  };

  const handleQuoteCreated = () => {
    loadDiagnosisAwaitingQuote(); // Recarregar lista
    setShowQuoteDialog(false);
    setSelectedDiagnosis(null);
    toast.success('Orçamento criado e enviado com sucesso!');
  };

  const getServiceTypeBadge = (type: string) => {
    switch (type) {
      case 'coleta_diagnostico':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Diagnóstico</Badge>;
      case 'coleta_conserto':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Conserto</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            Diagnósticos Aguardando Orçamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-600">Carregando diagnósticos...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5" />
              Diagnósticos Aguardando Orçamento
              {diagnosisList.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {diagnosisList.length}
                </Badge>
              )}
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadDiagnosisAwaitingQuote}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {diagnosisList.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhum diagnóstico pendente
              </h3>
              <p className="text-gray-600">
                Todos os diagnósticos já possuem orçamentos ou não há diagnósticos concluídos.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {diagnosisList.map((diagnosis) => (
                <div 
                  key={diagnosis.id} 
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h4 className="font-medium text-gray-900">
                          {diagnosis.client_name}
                        </h4>
                        {getServiceTypeBadge(diagnosis.service_attendance_type)}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <span className="text-sm font-medium text-gray-600">Equipamento:</span>
                          <p className="text-sm">{diagnosis.equipment_type}</p>
                          {diagnosis.equipment_model && (
                            <p className="text-xs text-gray-500">{diagnosis.equipment_model}</p>
                          )}
                        </div>
                        
                        <div>
                          <span className="text-sm font-medium text-gray-600">Diagnóstico:</span>
                          <p className="text-sm">{diagnosis.diagnosis.diagnosis_details}</p>
                        </div>
                        
                        <div>
                          <span className="text-sm font-medium text-gray-600">Serviço Recomendado:</span>
                          <p className="text-sm">{diagnosis.diagnosis.recommended_service}</p>
                        </div>
                        

                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Diagnóstico: {formatDate(diagnosis.diagnosisDate)}
                        </div>

                      </div>
                    </div>
                    
                    <Button 
                      onClick={() => handleCreateQuote(diagnosis)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <DollarSign className="h-4 w-4 mr-2" />
                      Criar Orçamento
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <QuoteCreationDialog
        open={showQuoteDialog}
        onOpenChange={setShowQuoteDialog}
        diagnosis={selectedDiagnosis}
        onSuccess={handleQuoteCreated}
      />
    </>
  );
}
