import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  AlertTriangle, 
  EyeOff, 
  Clock, 
  User,
  Edit2,
  Trash2,
  Save,
  X,
  MoreVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { CommentService } from '@/services/comments/commentService';
import { 
  CommentItemProps, 
  getCommentPermissions,
  COMMENT_CONSTANTS 
} from '@/types/comments';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

export function CommentItem({ 
  comment, 
  currentUserRole, 
  onEdit, 
  onDelete 
}: CommentItemProps) {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editMessage, setEditMessage] = useState(comment.message);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const permissions = getCommentPermissions(currentUserRole);
  const isOwnComment = user?.id === comment.user_id;
  const canEdit = permissions.canEdit && isOwnComment;
  const canDelete = permissions.canDelete || (isOwnComment && comment.user_role !== 'admin');

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'technician':
        return 'bg-blue-100 text-blue-800';
      case 'workshop':
        return 'bg-green-100 text-green-800';
      case 'client':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'technician':
        return 'Técnico';
      case 'workshop':
        return 'Oficina';
      case 'client':
        return 'Cliente';
      default:
        return role;
    }
  };

  const handleEdit = async () => {
    if (!editMessage.trim()) {
      toast.error('Mensagem não pode estar vazia');
      return;
    }

    setIsUpdating(true);
    try {
      const success = await CommentService.updateComment(
        comment.id,
        editMessage.trim(),
        user!.id
      );

      if (success) {
        const updatedComment = {
          ...comment,
          message: editMessage.trim(),
          updated_at: new Date().toISOString()
        };
        onEdit?.(updatedComment);
        setIsEditing(false);
        toast.success('Comentário atualizado!');
      }
    } catch (error) {
      console.error('Erro ao atualizar comentário:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja deletar este comentário?')) {
      return;
    }

    setIsDeleting(true);
    try {
      const success = await CommentService.deleteComment(
        comment.id,
        user!.id,
        currentUserRole
      );

      if (success) {
        onDelete?.(comment.id);
        toast.success('Comentário deletado!');
      }
    } catch (error) {
      console.error('Erro ao deletar comentário:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelEdit = () => {
    setEditMessage(comment.message);
    setIsEditing(false);
  };

  return (
    <div className="p-4 hover:bg-gray-50 transition-colors">
      <div className="space-y-3">
        {/* Header do comentário */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-400" />
              <span className="font-medium text-sm">{comment.user_name}</span>
            </div>
            
            <Badge variant="outline" className={`text-xs ${getRoleColor(comment.user_role)}`}>
              {getRoleLabel(comment.user_role)}
            </Badge>

            {comment.is_internal && (
              <Badge variant="secondary" className="text-xs">
                <EyeOff className="h-3 w-3 mr-1" />
                Interno
              </Badge>
            )}

            {comment.is_urgent && (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Urgente
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Clock className="h-3 w-3" />
              <span>
                {formatDistanceToNow(new Date(comment.created_at), { 
                  addSuffix: true, 
                  locale: ptBR 
                })}
              </span>
              {comment.updated_at && comment.updated_at !== comment.created_at && (
                <span className="text-gray-400">(editado)</span>
              )}
            </div>

            {(canEdit || canDelete) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canEdit && (
                    <DropdownMenuItem onClick={() => setIsEditing(true)}>
                      <Edit2 className="h-3 w-3 mr-2" />
                      Editar
                    </DropdownMenuItem>
                  )}
                  {canDelete && (
                    <DropdownMenuItem 
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="text-red-600"
                    >
                      <Trash2 className="h-3 w-3 mr-2" />
                      {isDeleting ? 'Deletando...' : 'Deletar'}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Conteúdo do comentário */}
        {isEditing ? (
          <div className="space-y-3">
            <Textarea
              value={editMessage}
              onChange={(e) => setEditMessage(e.target.value)}
              maxLength={COMMENT_CONSTANTS.MAX_MESSAGE_LENGTH}
              rows={3}
              className="resize-none"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {COMMENT_CONSTANTS.MAX_MESSAGE_LENGTH - editMessage.length} caracteres restantes
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelEdit}
                  disabled={isUpdating}
                >
                  <X className="h-3 w-3 mr-1" />
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleEdit}
                  disabled={isUpdating || !editMessage.trim()}
                >
                  <Save className="h-3 w-3 mr-1" />
                  {isUpdating ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-700 whitespace-pre-wrap">
            {comment.message}
          </div>
        )}
      </div>
    </div>
  );
}
