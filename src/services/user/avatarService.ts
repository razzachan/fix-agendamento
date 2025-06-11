import { supabase } from '@/integrations/supabase/client';

export interface AvatarUploadResult {
  success: boolean;
  avatarUrl?: string;
  error?: string;
}

export class AvatarService {
  private static readonly BUCKET_NAME = 'service-photos'; // Usar bucket existente que já funciona
  private static readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private static readonly ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

  /**
   * Valida o arquivo de imagem
   */
  static validateFile(file: File): { valid: boolean; error?: string } {
    // Verificar tipo
    if (!this.ALLOWED_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: 'Tipo de arquivo não suportado. Use JPG, PNG, WebP ou GIF.'
      };
    }

    // Verificar tamanho
    if (file.size > this.MAX_FILE_SIZE) {
      return {
        valid: false,
        error: 'Arquivo muito grande. Máximo 5MB.'
      };
    }

    return { valid: true };
  }

  /**
   * Faz upload do avatar para o Supabase Storage
   */
  static async uploadAvatar(file: File, userId: string): Promise<AvatarUploadResult> {
    try {
      console.log('📸 [AvatarService] Iniciando upload de avatar...');
      console.log('📸 [AvatarService] UserId:', userId);
      console.log('📸 [AvatarService] File:', file.name, file.size, file.type);

      // Validar arquivo
      const validation = this.validateFile(file);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        };
      }

      // Verificar se o usuário está autenticado
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('📸 [AvatarService] Sessão atual:', session?.user?.id);
      console.log('📸 [AvatarService] Erro de sessão:', sessionError);

      if (!session || !session.user) {
        console.log('📸 [AvatarService] Tentando fazer upload sem autenticação Supabase');
        // Para clientes demo, vamos permitir o upload mesmo sem sessão Supabase
        console.log('📸 [AvatarService] Continuando com upload para usuário demo');
      }

      // Gerar nome único para o arquivo
      const fileExtension = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExtension}`;
      const filePath = `avatars/${userId}/${fileName}`; // Usar pasta avatars dentro do bucket

      console.log(`📸 [AvatarService] Fazendo upload: ${filePath}`);
      console.log(`📸 [AvatarService] Bucket: ${this.BUCKET_NAME}`);

      // Upload para o Supabase Storage com upsert true para sobrescrever
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true // Permitir sobrescrever arquivos existentes
        });

      if (uploadError) {
        console.error('❌ [AvatarService] Erro no upload:', uploadError);
        console.error('❌ [AvatarService] Detalhes do erro:', JSON.stringify(uploadError, null, 2));
        return {
          success: false,
          error: `Erro ao fazer upload: ${uploadError.message || 'Erro desconhecido'}`
        };
      }

      console.log('✅ [AvatarService] Upload realizado:', uploadData);

      // Obter URL pública da imagem
      const { data: urlData } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(filePath);

      const avatarUrl = urlData.publicUrl;
      console.log('🔗 [AvatarService] URL pública:', avatarUrl);

      // Atualizar o campo avatar na tabela users
      const updateResult = await this.updateUserAvatar(userId, avatarUrl);
      if (!updateResult.success) {
        return updateResult;
      }

      // Atualizar localStorage se existir sessão
      try {
        const sessionKey = 'eletrofix_session'; // Usar a mesma chave do persistentSession
        const userSession = localStorage.getItem(sessionKey);
        if (userSession) {
          const userData = JSON.parse(userSession);
          if (userData.id === userId) {
            userData.avatar = avatarUrl;
            localStorage.setItem(sessionKey, JSON.stringify(userData));
            console.log('✅ [AvatarService] LocalStorage atualizado com novo avatar');
          }
        }
      } catch (error) {
        console.warn('⚠️ [AvatarService] Erro ao atualizar localStorage:', error);
      }

      // Disparar evento customizado para atualizar o contexto de auth
      window.dispatchEvent(new CustomEvent('avatarUpdated', {
        detail: { userId, avatarUrl }
      }));

      return {
        success: true,
        avatarUrl
      };

    } catch (error) {
      console.error('❌ [AvatarService] Erro geral:', error);
      return {
        success: false,
        error: 'Erro interno. Tente novamente mais tarde.'
      };
    }
  }

  /**
   * Atualiza o campo avatar na tabela users
   */
  static async updateUserAvatar(userId: string, avatarUrl: string): Promise<AvatarUploadResult> {
    try {
      console.log(`💾 [AvatarService] Atualizando avatar do usuário ${userId}`);

      const { error } = await supabase
        .from('users')
        .update({ avatar: avatarUrl })
        .eq('id', userId);

      if (error) {
        console.error('❌ [AvatarService] Erro ao atualizar usuário:', error);
        return {
          success: false,
          error: 'Erro ao salvar avatar no perfil.'
        };
      }

      console.log('✅ [AvatarService] Avatar atualizado no banco de dados');
      return {
        success: true,
        avatarUrl
      };

    } catch (error) {
      console.error('❌ [AvatarService] Erro ao atualizar usuário:', error);
      return {
        success: false,
        error: 'Erro ao salvar avatar no perfil.'
      };
    }
  }

  /**
   * Remove avatar antigo do storage
   */
  static async removeOldAvatar(userId: string): Promise<void> {
    try {
      console.log(`🗑️ [AvatarService] Removendo avatars antigos do usuário ${userId}`);

      // Listar arquivos do usuário
      const { data: files, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .list(`avatars/${userId}`);

      if (error || !files) {
        console.log('ℹ️ [AvatarService] Nenhum arquivo antigo encontrado');
        return;
      }

      // Remover todos os arquivos antigos
      const filesToRemove = files.map(file => `avatars/${userId}/${file.name}`);
      
      if (filesToRemove.length > 0) {
        const { error: removeError } = await supabase.storage
          .from(this.BUCKET_NAME)
          .remove(filesToRemove);

        if (removeError) {
          console.error('⚠️ [AvatarService] Erro ao remover arquivos antigos:', removeError);
        } else {
          console.log(`✅ [AvatarService] ${filesToRemove.length} arquivo(s) antigo(s) removido(s)`);
        }
      }

    } catch (error) {
      console.error('⚠️ [AvatarService] Erro ao limpar arquivos antigos:', error);
    }
  }

  /**
   * Processo completo de upload com limpeza
   */
  static async uploadAvatarComplete(file: File, userId: string): Promise<AvatarUploadResult> {
    try {
      // Remover avatars antigos primeiro
      await this.removeOldAvatar(userId);

      // Fazer upload do novo avatar
      return await this.uploadAvatar(file, userId);

    } catch (error) {
      console.error('❌ [AvatarService] Erro no processo completo:', error);
      return {
        success: false,
        error: 'Erro ao processar upload. Tente novamente.'
      };
    }
  }

  /**
   * Obter URL do avatar atual do usuário
   */
  static async getCurrentAvatar(userId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('avatar')
        .eq('id', userId)
        .single();

      if (error || !data) {
        return null;
      }

      return data.avatar;

    } catch (error) {
      console.error('❌ [AvatarService] Erro ao obter avatar atual:', error);
      return null;
    }
  }
}

export default AvatarService;
