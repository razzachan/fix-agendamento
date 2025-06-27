import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  MessageSquare,
  AlertTriangle,
  EyeOff,
  Clock,
  User,
  RefreshCw,
  Loader2,
  Eye
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { CommentService } from '@/services/comments/commentService';
import { CommentForm } from './CommentForm';
import { CommentItem } from './CommentItem';
import { 
  ServiceOrderComment, 
  CommentListProps, 
  getCommentPermissions 
} from '@/types/comments';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function CommentList({ 
  serviceOrderId, 
  userRole, 
  className = '' 
}: CommentListProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<ServiceOrderComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const permissions = getCommentPermissions(userRole);

  const loadComments = async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const data = await CommentService.getCommentsByOrderId(
        serviceOrderId,
        userRole
      );
      setComments(data);
    } catch (error) {
      console.error('Erro ao carregar comentários:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleCommentAdded = (newComment: ServiceOrderComment) => {
    setComments(prev => [...prev, newComment]);
  };

  const handleCommentUpdated = (updatedComment: ServiceOrderComment) => {
    setComments(prev => 
      prev.map(comment => 
        comment.id === updatedComment.id ? updatedComment : comment
      )
    );
  };

  const handleCommentDeleted = (commentId: string) => {
    setComments(prev => prev.filter(comment => comment.id !== commentId));
  };

  useEffect(() => {
    loadComments();
  }, [serviceOrderId, userRole]);

  // Auto-refresh a cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      loadComments(false);
    }, 30000);

    return () => clearInterval(interval);
  }, [serviceOrderId, userRole]);

  const visibleComments = comments.filter(comment => {
    // Clientes não veem comentários internos
    if (userRole === 'client' && comment.is_internal) {
      return false;
    }
    return true;
  });

  const urgentComments = visibleComments.filter(c => c.is_urgent);
  const internalComments = visibleComments.filter(c => c.is_internal);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Carregando comentários...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header com estatísticas */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Observações e Comentários
              <Badge variant="outline">{visibleComments.length}</Badge>
            </CardTitle>
            
            <div className="flex items-center gap-2">
              {urgentComments.length > 0 && (
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {urgentComments.length} urgente{urgentComments.length > 1 ? 's' : ''}
                </Badge>
              )}
              
              {permissions.canViewInternal && internalComments.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  <EyeOff className="h-3 w-3 mr-1" />
                  {internalComments.length} interno{internalComments.length > 1 ? 's' : ''}
                </Badge>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => loadComments(false)}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Formulário para novo comentário */}
      {permissions.canCreate && (
        <CommentForm
          serviceOrderId={serviceOrderId}
          onCommentAdded={handleCommentAdded}
          allowInternal={permissions.canCreateInternal}
          allowUrgent={permissions.canMarkUrgent}
        />
      )}

      {/* Lista de comentários */}
      {visibleComments.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {visibleComments.map((comment, index) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  currentUserRole={userRole}
                  onEdit={handleCommentUpdated}
                  onDelete={handleCommentDeleted}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-gray-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <h3 className="font-medium mb-1">Nenhum comentário ainda</h3>
              <p className="text-sm">
                {permissions.canCreate 
                  ? 'Seja o primeiro a adicionar uma observação sobre esta ordem de serviço.'
                  : 'Não há comentários para esta ordem de serviço.'
                }
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Informações sobre tipos de comentário */}
      {permissions.canViewInternal && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="text-sm text-blue-800 space-y-2">
              <div className="font-medium">Tipos de comentários:</div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Eye className="h-3 w-3" />
                  <span><strong>Público:</strong> Visível para todos, incluindo o cliente</span>
                </div>
                <div className="flex items-center gap-2">
                  <EyeOff className="h-3 w-3" />
                  <span><strong>Interno:</strong> Visível apenas para a equipe</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-3 w-3" />
                  <span><strong>Urgente:</strong> Envia notificações imediatas</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
