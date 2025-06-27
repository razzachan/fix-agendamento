/**
 * Tipos para sistema de comentários/observações das OS
 */

export interface ServiceOrderComment {
  id: string;
  service_order_id: string;
  user_id: string;
  user_name: string;
  user_role: 'admin' | 'technician' | 'workshop' | 'client';
  message: string;
  is_internal: boolean; // Visível apenas para equipe (não para cliente)
  is_urgent: boolean; // Comentário urgente que gera notificação
  created_at: string;
  updated_at?: string;
  attachments?: CommentAttachment[];
}

export interface CommentAttachment {
  id: string;
  comment_id: string;
  file_name: string;
  file_url: string;
  file_type: 'image' | 'document' | 'other';
  file_size: number;
  created_at: string;
}

export interface CreateCommentRequest {
  service_order_id: string;
  message: string;
  is_internal?: boolean;
  is_urgent?: boolean;
  attachments?: File[];
}

export interface CommentFilters {
  service_order_id?: string;
  user_role?: string;
  is_internal?: boolean;
  is_urgent?: boolean;
  date_from?: string;
  date_to?: string;
}

export interface CommentNotification {
  id: string;
  comment_id: string;
  recipient_user_id: string;
  recipient_role: string;
  is_read: boolean;
  created_at: string;
}

// Tipos para componentes
export interface CommentListProps {
  serviceOrderId: string;
  userRole: 'admin' | 'technician' | 'workshop' | 'client';
  className?: string;
}

export interface CommentFormProps {
  serviceOrderId: string;
  onCommentAdded: (comment: ServiceOrderComment) => void;
  placeholder?: string;
  allowInternal?: boolean;
  allowUrgent?: boolean;
  allowAttachments?: boolean;
}

export interface CommentItemProps {
  comment: ServiceOrderComment;
  currentUserRole: string;
  onEdit?: (comment: ServiceOrderComment) => void;
  onDelete?: (commentId: string) => void;
}

// Constantes
export const COMMENT_CONSTANTS = {
  MAX_MESSAGE_LENGTH: 1000,
  MAX_ATTACHMENTS: 3,
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain'],
  REFRESH_INTERVAL: 30000, // 30 segundos
} as const;

// Tipos para permissões
export interface CommentPermissions {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canViewInternal: boolean;
  canCreateInternal: boolean;
  canMarkUrgent: boolean;
  canAttachFiles: boolean;
}

// Função para calcular permissões baseadas no role
export const getCommentPermissions = (userRole: string): CommentPermissions => {
  switch (userRole) {
    case 'admin':
      return {
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: true,
        canViewInternal: true,
        canCreateInternal: true,
        canMarkUrgent: true,
        canAttachFiles: true,
      };
    
    case 'technician':
      return {
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: false,
        canViewInternal: true,
        canCreateInternal: true,
        canMarkUrgent: true,
        canAttachFiles: true,
      };
    
    case 'workshop':
      return {
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: false,
        canViewInternal: true,
        canCreateInternal: true,
        canMarkUrgent: false,
        canAttachFiles: true,
      };
    
    case 'client':
      return {
        canView: true,
        canCreate: true,
        canEdit: false,
        canDelete: false,
        canViewInternal: false,
        canCreateInternal: false,
        canMarkUrgent: false,
        canAttachFiles: false,
      };
    
    default:
      return {
        canView: false,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canViewInternal: false,
        canCreateInternal: false,
        canMarkUrgent: false,
        canAttachFiles: false,
      };
  }
};
