import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Send, 
  AlertTriangle, 
  Eye, 
  EyeOff,
  Loader2 
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { CommentService } from '@/services/comments/commentService';
import { 
  CommentFormProps, 
  getCommentPermissions, 
  COMMENT_CONSTANTS 
} from '@/types/comments';
import { toast } from 'sonner';

export function CommentForm({
  serviceOrderId,
  onCommentAdded,
  placeholder = "Adicione uma observação...",
  allowInternal = true,
  allowUrgent = true,
  allowAttachments = false
}: CommentFormProps) {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!user) return null;

  const permissions = getCommentPermissions(user.role);
  const remainingChars = COMMENT_CONSTANTS.MAX_MESSAGE_LENGTH - message.length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) {
      toast.error('Digite uma mensagem');
      return;
    }

    if (!permissions.canCreate) {
      toast.error('Você não tem permissão para adicionar comentários');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const comment = await CommentService.createComment(
        {
          service_order_id: serviceOrderId,
          message: message.trim(),
          is_internal: isInternal && permissions.canCreateInternal,
          is_urgent: isUrgent && permissions.canMarkUrgent
        },
        user.id,
        user.name || 'Usuário',
        user.role
      );

      if (comment) {
        setMessage('');
        setIsInternal(false);
        setIsUrgent(false);
        onCommentAdded(comment);
        toast.success('Comentário adicionado com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao adicionar comentário:', error);
      toast.error('Erro ao adicionar comentário');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!permissions.canCreate) {
    return (
      <Card className="border-gray-200">
        <CardContent className="p-4">
          <div className="text-center text-gray-500">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Você não tem permissão para adicionar comentários</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-gray-200">
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Campo de mensagem */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="comment-message" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Nova Observação
              </Label>
              <div className="flex items-center gap-2">
                {isInternal && (
                  <Badge variant="secondary" className="text-xs">
                    <EyeOff className="h-3 w-3 mr-1" />
                    Interno
                  </Badge>
                )}
                {isUrgent && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Urgente
                  </Badge>
                )}
              </div>
            </div>
            
            <Textarea
              id="comment-message"
              placeholder={placeholder}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              maxLength={COMMENT_CONSTANTS.MAX_MESSAGE_LENGTH}
              className="resize-none"
            />
            
            <div className="flex justify-between items-center text-xs text-gray-500">
              <span>
                {remainingChars < 0 ? (
                  <span className="text-red-500">
                    {Math.abs(remainingChars)} caracteres a mais
                  </span>
                ) : (
                  `${remainingChars} caracteres restantes`
                )}
              </span>
            </div>
          </div>

          {/* Opções */}
          <div className="flex flex-wrap gap-4">
            {allowInternal && permissions.canCreateInternal && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="internal"
                  checked={isInternal}
                  onCheckedChange={(checked) => setIsInternal(checked as boolean)}
                />
                <Label htmlFor="internal" className="text-sm flex items-center gap-1">
                  <EyeOff className="h-3 w-3" />
                  Comentário interno
                </Label>
              </div>
            )}

            {allowUrgent && permissions.canMarkUrgent && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="urgent"
                  checked={isUrgent}
                  onCheckedChange={(checked) => setIsUrgent(checked as boolean)}
                />
                <Label htmlFor="urgent" className="text-sm flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Urgente
                </Label>
              </div>
            )}
          </div>

          {/* Explicações */}
          {(isInternal || isUrgent) && (
            <div className="text-xs text-gray-600 space-y-1">
              {isInternal && (
                <div className="flex items-center gap-1">
                  <EyeOff className="h-3 w-3" />
                  <span>Comentário interno não será visível para o cliente</span>
                </div>
              )}
              {isUrgent && (
                <div className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  <span>Comentário urgente enviará notificações imediatas</span>
                </div>
              )}
            </div>
          )}

          {/* Botão de envio */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isSubmitting || !message.trim() || remainingChars < 0}
              className="flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Adicionar Comentário
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
