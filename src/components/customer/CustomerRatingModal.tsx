import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Star, Loader2 } from 'lucide-react';

interface CustomerRatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceOrderId: string;
  technicianId: string;
  customerId: string;
  technicianName: string;
  equipmentType: string;
  equipmentModel: string;
}

interface RatingData {
  overall_rating: number;
  punctuality_rating: number;
  quality_rating: number;
  communication_rating: number;
  comment: string;
  would_recommend: boolean;
}

/**
 * Modal para avaliação do cliente sobre o serviço prestado
 */
export const CustomerRatingModal: React.FC<CustomerRatingModalProps> = ({
  isOpen,
  onClose,
  serviceOrderId,
  technicianId,
  customerId,
  technicianName,
  equipmentType,
  equipmentModel
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ratings, setRatings] = useState<RatingData>({
    overall_rating: 0,
    punctuality_rating: 0,
    quality_rating: 0,
    communication_rating: 0,
    comment: '',
    would_recommend: true
  });
  const { toast } = useToast();

  /**
   * Renderizar estrelas para avaliação
   */
  const renderStars = (
    rating: number, 
    onRatingChange: (rating: number) => void,
    label: string
  ) => {
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium">{label}</Label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => onRatingChange(star)}
              className="transition-colors hover:scale-110"
            >
              <Star
                className={`h-6 w-6 ${
                  star <= rating
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300 hover:text-yellow-300'
                }`}
              />
            </button>
          ))}
        </div>
      </div>
    );
  };

  /**
   * Submeter avaliação
   */
  const handleSubmit = async () => {
    // Validar avaliação geral obrigatória
    if (ratings.overall_rating === 0) {
      toast({
        title: "Avaliação obrigatória",
        description: "Por favor, dê uma avaliação geral do serviço",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('customer_ratings')
        .insert({
          service_order_id: serviceOrderId,
          technician_id: technicianId,
          customer_id: customerId,
          overall_rating: ratings.overall_rating,
          punctuality_rating: ratings.punctuality_rating || null,
          quality_rating: ratings.quality_rating || null,
          communication_rating: ratings.communication_rating || null,
          comment: ratings.comment || null,
          would_recommend: ratings.would_recommend
        });

      if (error) {
        console.error('Erro ao salvar avaliação:', error);
        toast({
          title: "Erro ao salvar avaliação",
          description: "Não foi possível salvar sua avaliação. Tente novamente.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Avaliação enviada!",
        description: "Obrigado pelo seu feedback. Sua avaliação é muito importante para nós.",
      });

      onClose();
    } catch (error) {
      console.error('Erro geral ao salvar avaliação:', error);
      toast({
        title: "Erro inesperado",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Resetar formulário ao fechar
   */
  const handleClose = () => {
    setRatings({
      overall_rating: 0,
      punctuality_rating: 0,
      quality_rating: 0,
      communication_rating: 0,
      comment: '',
      would_recommend: true
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Avalie o Serviço
          </DialogTitle>
          <DialogDescription>
            Como foi o atendimento do técnico {technicianName} para seu {equipmentType} {equipmentModel}?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Avaliação Geral */}
          {renderStars(
            ratings.overall_rating,
            (rating) => setRatings(prev => ({ ...prev, overall_rating: rating })),
            "Avaliação Geral *"
          )}

          {/* Avaliações Específicas */}
          <div className="space-y-4">
            {renderStars(
              ratings.punctuality_rating,
              (rating) => setRatings(prev => ({ ...prev, punctuality_rating: rating })),
              "Pontualidade"
            )}

            {renderStars(
              ratings.quality_rating,
              (rating) => setRatings(prev => ({ ...prev, quality_rating: rating })),
              "Qualidade do Serviço"
            )}

            {renderStars(
              ratings.communication_rating,
              (rating) => setRatings(prev => ({ ...prev, communication_rating: rating })),
              "Comunicação"
            )}
          </div>

          {/* Comentário */}
          <div className="space-y-2">
            <Label htmlFor="comment">Comentário (opcional)</Label>
            <Textarea
              id="comment"
              placeholder="Conte-nos mais sobre sua experiência..."
              value={ratings.comment}
              onChange={(e) => setRatings(prev => ({ ...prev, comment: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Recomendação */}
          <div className="space-y-2">
            <Label>Você recomendaria nossos serviços?</Label>
            <div className="flex gap-4">
              <Button
                type="button"
                variant={ratings.would_recommend ? "default" : "outline"}
                size="sm"
                onClick={() => setRatings(prev => ({ ...prev, would_recommend: true }))}
              >
                Sim
              </Button>
              <Button
                type="button"
                variant={!ratings.would_recommend ? "destructive" : "outline"}
                size="sm"
                onClick={() => setRatings(prev => ({ ...prev, would_recommend: false }))}
              >
                Não
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              'Enviar Avaliação'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
