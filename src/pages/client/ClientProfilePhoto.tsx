import React, { useState, useRef, useEffect } from 'react';
import { ClientLayout } from '@/components/client/ClientLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { User, Camera, Upload, ArrowLeft, Save, X, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AvatarService } from '@/services/user/avatarService';

export function ClientProfilePhoto() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentAvatar, setCurrentAvatar] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carregar avatar atual ao montar o componente
  useEffect(() => {
    const loadCurrentAvatar = async () => {
      if (user?.id) {
        const avatarUrl = await AvatarService.getCurrentAvatar(user.id);
        setCurrentAvatar(avatarUrl);
      }
    };

    loadCurrentAvatar();
  }, [user?.id]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setError(null);

      // Validar arquivo usando o serviço
      const validation = AvatarService.validateFile(file);
      if (!validation.valid) {
        setError(validation.error || 'Arquivo inválido');
        return;
      }

      // Salvar arquivo e criar preview
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = () => {
    fileInputRef.current?.click();
  };

  const handleSave = async () => {
    if (!selectedFile || !user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      console.log('📸 Salvando nova foto de perfil...');

      const result = await AvatarService.uploadAvatarComplete(selectedFile, user.id);

      if (result.success) {
        console.log('✅ Foto salva com sucesso!', result.avatarUrl);
        // Atualizar o avatar atual para mostrar a nova imagem
        setCurrentAvatar(result.avatarUrl);

        // Forçar atualização do contexto de auth
        console.log('🔄 Forçando atualização do contexto...');
        await refreshUser();

        // Aguardar um pouco e navegar de volta
        setTimeout(() => {
          console.log('🔄 Navegando de volta para o perfil...');
          navigate('/client/profile');
        }, 2000);
      } else {
        console.error('❌ Erro detalhado:', result);
        setError(result.error || 'Erro ao salvar foto');
      }
    } catch (error) {
      console.error('❌ Erro ao salvar foto:', error);
      setError('Erro interno. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = () => {
    setSelectedImage(null);
    setSelectedFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <ClientLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/client/profile')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Alterar Foto</h1>
            <p className="text-gray-600 mt-1">Atualize sua foto de perfil</p>
          </div>
        </div>

        {/* Photo Card */}
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Camera className="h-5 w-5" />
              Foto de Perfil
            </CardTitle>
            <CardDescription>
              Escolha uma imagem que represente você. Formatos aceitos: JPG, PNG, GIF (máximo 5MB)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Preview da Foto */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="flex items-center justify-center w-32 h-32 bg-gray-100 rounded-full overflow-hidden border-4 border-white shadow-lg">
                  {selectedImage ? (
                    <img
                      src={selectedImage}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : currentAvatar ? (
                    <img
                      src={currentAvatar}
                      alt="Avatar atual"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="h-16 w-16 text-gray-400" />
                  )}
                </div>

                {selectedImage && (
                  <Button
                    size="sm"
                    variant="destructive"
                    className="absolute -top-2 -right-2 rounded-full w-8 h-8 p-0"
                    onClick={handleRemove}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Erro */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Informações do usuário */}
            <div className="text-center space-y-1">
              <h3 className="font-semibold text-lg">{user?.name || 'Cliente'}</h3>
              <p className="text-gray-500 text-sm">{user?.email}</p>
            </div>

            {/* Input de arquivo (oculto) */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Botões de ação */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={handleUpload}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Escolher Imagem
              </Button>

              {selectedFile && (
                <Button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {isLoading ? 'Salvando...' : 'Salvar Foto'}
                </Button>
              )}
            </div>

            {/* Dicas */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Dicas para uma boa foto:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Use uma imagem clara e bem iluminada</li>
                <li>• Prefira fotos onde seu rosto apareça claramente</li>
                <li>• Evite imagens muito escuras ou borradas</li>
                <li>• A imagem será redimensionada automaticamente</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </ClientLayout>
  );
}
