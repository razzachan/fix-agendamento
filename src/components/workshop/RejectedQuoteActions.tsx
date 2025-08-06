import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, X, CheckCircle } from 'lucide-react';
import { ServiceOrder } from '@/types';
import { toast } from 'sonner';
import { rejectedQuoteService } from '@/services/workshop/rejectedQuoteService';
import { useAuth } from '@/contexts/AuthContext';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface RejectedQuoteActionsProps {
  order: ServiceOrder;
  onStatusUpdate: () => void;
}

export function RejectedQuoteActions({ order, onStatusUpdate }: RejectedQuoteActionsProps) {
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notes, setNotes] = useState('');
  const { user } = useAuth();

  // Só mostrar para ordens com orçamento rejeitado
  if (order.status !== 'quote_rejected') {
    return null;
  }

  const handleCloseEquipment = async () => {
    if (!user?.id) {
      toast.error('Erro: usuário não identificado.');
      return;
    }

    setIsProcessing(true);
    try {
      const success = await rejectedQuoteService.closeRejectedEquipment(
        order.id,
        user.id,
        notes.trim() || 'Equipamento fechado - orçamento rejeitado pelo cliente'
      );

      if (success) {
        toast.success('Equipamento fechado com sucesso! Pronto para entrega.');
        setShowCloseDialog(false);
        setNotes('');
        onStatusUpdate();
      }

    } catch (error) {
      console.error('Erro ao fechar equipamento:', error);
      toast.error('Erro ao fechar equipamento. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="bg-red-100 text-red-800">
              <X className="h-3 w-3 mr-1" />
              Orçamento Rejeitado
            </Badge>
            <div className="text-sm text-gray-600">
              Cliente rejeitou o orçamento. Feche o equipamento para entrega.
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <AlertDialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
              <AlertDialogTrigger asChild>
                <Button 
                  className="bg-orange-600 hover:bg-orange-700"
                  size="sm"
                >
                  <Package className="h-4 w-4 mr-2" />
                  Fechar Equipamento
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Fechar Equipamento</AlertDialogTitle>
                  <AlertDialogDescription>
                    O cliente rejeitou o orçamento. Vamos fechar o equipamento e prepará-lo para entrega.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="notes">Observações do Fechamento</Label>
                    <Textarea
                      id="notes"
                      placeholder="Ex: Equipamento fechado, sem reparo realizado. Cliente rejeitou orçamento de R$ 878,00..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>

                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleCloseEquipment}
                    disabled={isProcessing}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Fechando...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Confirmar Fechamento
                      </>
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </>
  );
}
