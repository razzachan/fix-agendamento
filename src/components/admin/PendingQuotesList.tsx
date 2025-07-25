import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, CheckCircle, XCircle, Clock, RefreshCw, MessageSquare } from 'lucide-react';
import { quoteService } from '@/services/admin/quoteService';
import { QuoteApprovalDialog } from './QuoteApprovalDialog';
import { toast } from 'sonner';

interface PendingQuote {
  id: string;
  client_name: string;
  equipment_type: string;
  equipment_model?: string;
  service_attendance_type: string;
  created_at: string;
  quote: {
    labor_cost: number;
    parts_cost: number;
    total_cost: number;
    estimated_days: number;
    notes?: string;
    valid_until: string;
    created_by: string;
  };
  quoteDate: string;
}

export function PendingQuotesList() {
  const [quotesList, setQuotesList] = useState<PendingQuote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedQuote, setSelectedQuote] = useState<PendingQuote | null>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalType, setApprovalType] = useState<'approve' | 'reject'>('approve');

  const loadPendingQuotes = async () => {
    setIsLoading(true);
    try {
      const quotes = await quoteService.getPendingQuotes();
      setQuotesList(quotes);
      
      if (quotes.length === 0) {
        console.log('Nenhum orçamento pendente de aprovação');
      }
    } catch (error) {
      console.error('Erro ao carregar orçamentos pendentes:', error);
      toast.error('Erro ao carregar orçamentos pendentes.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPendingQuotes();
  }, []);

  const handleApproveManually = (quote: PendingQuote) => {
    setSelectedQuote(quote);
    setApprovalType('approve');
    setShowApprovalDialog(true);
  };

  const handleRejectManually = (quote: PendingQuote) => {
    setSelectedQuote(quote);
    setApprovalType('reject');
    setShowApprovalDialog(true);
  };

  const handleApprovalSuccess = () => {
    loadPendingQuotes(); // Recarregar lista
    setShowApprovalDialog(false);
    setSelectedQuote(null);
    
    const message = approvalType === 'approve' 
      ? 'Orçamento aprovado com sucesso!' 
      : 'Orçamento rejeitado com sucesso!';
    toast.success(message);
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

  const getDaysUntilExpiry = (validUntil: string) => {
    const today = new Date();
    const expiryDate = new Date(validUntil);
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Orçamentos Aguardando Aprovação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-600">Carregando orçamentos...</span>
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
              <CreditCard className="h-5 w-5" />
              Orçamentos Aguardando Aprovação
              {quotesList.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {quotesList.length}
                </Badge>
              )}
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadPendingQuotes}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {quotesList.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhum orçamento pendente
              </h3>
              <p className="text-gray-600">
                Todos os orçamentos foram aprovados/rejeitados ou não há orçamentos enviados.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {quotesList.map((quote) => {
                const daysUntilExpiry = getDaysUntilExpiry(quote.quote.valid_until);
                const isExpiringSoon = daysUntilExpiry <= 3;
                const isExpired = daysUntilExpiry < 0;
                
                return (
                  <div
                    key={quote.id}
                    className={`border rounded-lg p-4 transition-colors ${
                      isExpired ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800' :
                      isExpiringSoon ? 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800' :
                      'hover:bg-gray-50 dark:hover:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h4 className="font-medium text-gray-900 dark:text-gray-100">
                            {quote.client_name}
                          </h4>
                          {getServiceTypeBadge(quote.service_attendance_type)}
                          
                          {/* Badge de validade */}
                          {isExpired ? (
                            <Badge variant="destructive">Expirado</Badge>
                          ) : isExpiringSoon ? (
                            <Badge variant="secondary" className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200">
                              Expira em {daysUntilExpiry} dias
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              Válido por {daysUntilExpiry} dias
                            </Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 mb-3">
                          <div>
                            <span className="text-sm font-medium text-gray-600">Equipamento:</span>
                            <p className="text-sm">{quote.equipment_type}</p>
                            {quote.equipment_model && (
                              <p className="text-xs text-gray-500">{quote.equipment_model}</p>
                            )}
                          </div>
                          
                          <div>
                            <span className="text-sm font-medium text-gray-600">Valor Total:</span>
                            <p className="text-lg font-bold text-green-600">
                              {formatCurrency(quote.quote.total_cost)}
                            </p>
                            <p className="text-xs text-gray-500">
                              Mão de obra: {formatCurrency(quote.quote.labor_cost)} | 
                              Peças: {formatCurrency(quote.quote.parts_cost)}
                            </p>
                          </div>
                          
                          <div>
                            <span className="text-sm font-medium text-gray-600">Prazo:</span>
                            <p className="text-sm">{quote.quote.estimated_days} dias</p>
                            <p className="text-xs text-gray-500">
                              Válido até: {new Date(quote.quote.valid_until).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                        
                        {quote.quote.notes && (
                          <div className="mb-3">
                            <span className="text-sm font-medium text-gray-600">Observações:</span>
                            <p className="text-sm text-gray-700">{quote.quote.notes}</p>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Enviado: {formatDate(quote.quoteDate)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2 ml-4">
                        <Button 
                          onClick={() => handleApproveManually(quote)}
                          className="bg-green-600 hover:bg-green-700"
                          size="sm"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Aprovar Manual
                        </Button>
                        
                        <Button 
                          onClick={() => handleRejectManually(quote)}
                          variant="destructive"
                          size="sm"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Rejeitar
                        </Button>
                        
                        <Button 
                          variant="outline"
                          size="sm"
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Enviar Link
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <QuoteApprovalDialog
        open={showApprovalDialog}
        onOpenChange={setShowApprovalDialog}
        quote={selectedQuote}
        approvalType={approvalType}
        onSuccess={handleApprovalSuccess}
      />
    </>
  );
}
