
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DiagnosisForm } from './DiagnosisForm';

interface DiagnosisDialogProps {
  serviceOrderId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function DiagnosisDialog({ serviceOrderId, open, onOpenChange, onSuccess }: DiagnosisDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Adicionar Diagnóstico</DialogTitle>
        </DialogHeader>
        <DiagnosisForm 
          serviceOrderId={serviceOrderId} 
          onSuccess={onSuccess}
        />
      </DialogContent>
    </Dialog>
  );
}
