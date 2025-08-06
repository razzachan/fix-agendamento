/**
 * Componente reutilizável para exibir card de orçamento para aprovação
 * Centraliza a lógica e UI do orçamento em um só lugar
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
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
import { CheckCircle, XCircle, FileText } from 'lucide-react';
import { ServiceOrder } from '@/types';
import { clientQuoteService } from '@/services/client/clientQuoteService';
import { toast } from 'sonner';

interface QuoteData {
  diagnosticFee: number;
  laborCost: number;
  partsCost: number;
  totalCost: number;
  description: string;
  details: Array<{
    item: string;
    value: number;
    note: string;
  }>;
}

interface QuoteApprovalCardProps {
  order: ServiceOrder;
  onQuoteResponse?: (approved: boolean) => void;
  className?: string;
}

export const QuoteApprovalCard: React.FC<QuoteApprovalCardProps> = ({
  order,
  onQuoteResponse,
  className = ""
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  // Dados do orçamento (mock - depois vamos buscar da API)
  const quoteData: QuoteData = {
    diagnosticFee: 50.00, // Taxa de diagnóstico
    laborCost: 120.00,    // Mão de obra
    partsCost: 80.00,     // Peças
    totalCost: 150.00,    // Total (diagnóstico + labor + peças - diagnóstico como mão de obra)
    description: "Necessário substituir capacitor do motor e limpeza geral do equipamento. O diagnóstico será descontado do valor total como mão de obra.",
    details: [
      { item: "Taxa de diagnóstico", value: 50.00, note: "Será descontada do total" },
      { item: "Capacitor do motor", value: 80.00, note: "Peça original" },
      { item: "Mão de obra (limpeza e instalação)", value: 120.00, note: "Inclui desconto do diagnóstico" }
    ]
  };

  const handleApproveQuote = async () => {
    setIsProcessing(true);
    try {
      const success = await clientQuoteService.approveQuote(order.id, quoteData.totalCost);
      if (success) {
        toast.success('Orçamento aprovado com sucesso!');
        onQuoteResponse?.(true);
      }
    } catch (error) {
      console.error('Erro ao aprovar orçamento:', error);
      toast.error('Erro ao aprovar orçamento. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectQuote = async () => {
    setIsProcessing(true);
    try {
      const success = await clientQuoteService.rejectQuote(order.id, 'Cliente rejeitou o orçamento');
      if (success) {
        toast.success('Orçamento rejeitado.');
        onQuoteResponse?.(false);
      }
    } catch (error) {
      console.error('Erro ao rejeitar orçamento:', error);
      toast.error('Erro ao rejeitar orçamento. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={`bg-orange-50 rounded-lg p-4 border border-orange-200 ${className}`}>
      <h4 className="font-semibold mb-3 flex items-center gap-2 text-orange-800">
        <FileText className="h-5 w-5 text-orange-600" />
        Orçamento Aguardando Aprovação
      </h4>

        {/* Descrição do problema e solução */}
        <div className="mb-4 p-3 bg-white rounded border">
          <h5 className="font-medium mb-2 text-sm">Diagnóstico e Solução:</h5>
          <p className="text-gray-700 text-xs leading-relaxed">
            {quoteData.description}
          </p>
        </div>

        {/* Detalhamento dos custos */}
        <div className="mb-4">
          <h5 className="font-medium mb-2 text-sm">Detalhamento dos Custos:</h5>
          <div className="space-y-3">
            {quoteData.details.map((detail, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-white rounded border">
                <div className="flex-1">
                  <p className="font-medium text-sm">{detail.item}</p>
                  <p className="text-xs text-gray-600">{detail.note}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">
                    R$ {detail.value.toFixed(2).replace('.', ',')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Total */}
        <div className="mb-4 p-3 bg-green-50 rounded border border-green-200">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-semibold text-green-800 text-sm">Valor Total:</p>
              <p className="text-xs text-green-600">
                (Já com desconto do diagnóstico)
              </p>
            </div>
            <p className="text-xl font-bold text-green-800">
              R$ {quoteData.totalCost.toFixed(2).replace('.', ',')}
            </p>
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
                  Você está aprovando o orçamento de <strong>R$ {quoteData.totalCost.toFixed(2).replace('.', ',')}</strong> para o reparo do seu equipamento.
                  <br /><br />
                  Após a aprovação, iniciaremos o reparo imediatamente e você será notificado sobre o progresso.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isProcessing}>
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleApproveQuote}
                  disabled={isProcessing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isProcessing ? 'Processando...' : 'Confirmar Aprovação'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Botão Rejeitar */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="flex-1 border-red-300 text-red-700 hover:bg-red-50 text-sm"
                disabled={isProcessing}
                size="sm"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Rejeitar Orçamento
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Rejeição do Orçamento</AlertDialogTitle>
                <AlertDialogDescription>
                  Você está rejeitando o orçamento de <strong>R$ {quoteData.totalCost.toFixed(2).replace('.', ',')}</strong>.
                  <br /><br />
                  Após a rejeição, entraremos em contato para discutir outras opções ou o equipamento será devolvido sem reparo.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isProcessing}>
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleRejectQuote}
                  disabled={isProcessing}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isProcessing ? 'Processando...' : 'Confirmar Rejeição'}
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
    </div>
  );
};

export default QuoteApprovalCard;
