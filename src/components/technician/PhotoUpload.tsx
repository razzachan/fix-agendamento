import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useServicePhotos } from '@/hooks/useServicePhotos';
import { useAuth } from '@/contexts/AuthContext';
import { ServicePhoto } from '@/services/photoService';
import {
  Camera,
  Upload,
  Image,
  X,
  Eye,
  Trash2,
  Edit3,
  Download,
  Loader2
} from 'lucide-react';

interface PhotoUploadProps {
  serviceOrderId: string;
  className?: string;
  onPhotoUploaded?: (photo: ServicePhoto) => void;
}

const PHOTO_TYPES = [
  { value: 'before', label: 'Antes do Serviço', color: 'bg-blue-100 text-blue-800' },
  { value: 'during', label: 'Durante o Serviço', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'after', label: 'Após o Serviço', color: 'bg-green-100 text-green-800' },
  { value: 'evidence', label: 'Evidência/Comprovante', color: 'bg-purple-100 text-purple-800' },
  { value: 'document', label: 'Documento', color: 'bg-gray-100 text-gray-800' }
] as const;

/**
 * Componente para upload e gestão de fotos dos serviços
 */
export const PhotoUpload: React.FC<PhotoUploadProps> = ({
  serviceOrderId,
  className,
  onPhotoUploaded
}) => {
  const { user } = useAuth();
  const {
    isUploading,
    photos,
    uploadProgress,
    uploadPhoto,
    uploadMultiplePhotos,
    deletePhoto,
    updateDescription,
    loadPhotos,
    getPhotoUrl,
    validateFile,
    formatFileSize,
    getPhotosByType
  } = useServicePhotos();

  const [selectedType, setSelectedType] = useState<ServicePhoto['photo_type']>('before');
  const [description, setDescription] = useState('');
  const [editingPhoto, setEditingPhoto] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [previewPhoto, setPreviewPhoto] = useState<ServicePhoto | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Carregar fotos ao montar o componente
  React.useEffect(() => {
    loadPhotos(serviceOrderId);
  }, [serviceOrderId, loadPhotos]);

  /**
   * Manipular seleção de arquivos
   */
  const handleFileSelect = async (files: FileList | null) => {
    if (!files || !user?.id) return;

    const fileArray = Array.from(files);
    
    // Validar arquivos
    for (const file of fileArray) {
      const validation = validateFile(file);
      if (!validation.isValid) {
        alert(`Erro no arquivo ${file.name}: ${validation.error}`);
        return;
      }
    }

    try {
      if (fileArray.length === 1) {
        // Upload único
        const result = await uploadPhoto(fileArray[0], {
          serviceOrderId,
          technicianId: user.id,
          photoType: selectedType,
          description: description || undefined,
          includeLocation: true
        });

        if (result && onPhotoUploaded) {
          onPhotoUploaded(result);
        }
      } else {
        // Upload múltiplo
        const results = await uploadMultiplePhotos(fileArray, {
          serviceOrderId,
          technicianId: user.id,
          photoType: selectedType,
          includeLocation: true
        });

        results.forEach(photo => {
          if (onPhotoUploaded) {
            onPhotoUploaded(photo);
          }
        });
      }

      // Limpar formulário
      setDescription('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    } catch (error) {
      console.error('Erro no upload:', error);
    }
  };

  /**
   * Visualizar foto
   */
  const handlePreviewPhoto = async (photo: ServicePhoto) => {
    try {
      const url = await getPhotoUrl(photo.file_path);
      setPreviewUrl(url);
      setPreviewPhoto(photo);
    } catch (error) {
      console.error('Erro ao carregar foto:', error);
    }
  };

  /**
   * Editar descrição
   */
  const handleEditDescription = (photo: ServicePhoto) => {
    setEditingPhoto(photo.id!);
    setEditDescription(photo.description || '');
  };

  /**
   * Salvar descrição editada
   */
  const handleSaveDescription = async (photoId: string) => {
    const success = await updateDescription(photoId, editDescription);
    if (success) {
      setEditingPhoto(null);
      setEditDescription('');
    }
  };

  /**
   * Deletar foto
   */
  const handleDeletePhoto = async (photoId: string) => {
    if (window.confirm('Tem certeza que deseja remover esta foto?')) {
      await deletePhoto(photoId);
    }
  };

  /**
   * Obter tipo de foto formatado
   */
  const getPhotoTypeInfo = (type: ServicePhoto['photo_type']) => {
    return PHOTO_TYPES.find(t => t.value === type) || PHOTO_TYPES[0];
  };

  return (
    <div className={className}>
      {/* Formulário de Upload */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-blue-600" />
            Adicionar Fotos
          </CardTitle>
          <CardDescription>
            Documente o serviço com fotos organizadas por categoria
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Seletor de tipo */}
          <div className="space-y-2">
            <Label>Tipo da Foto</Label>
            <div className="flex flex-wrap gap-2">
              {PHOTO_TYPES.map((type) => (
                <Button
                  key={type.value}
                  variant={selectedType === type.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedType(type.value)}
                  className="text-xs"
                >
                  {type.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              placeholder="Descreva o que está sendo mostrado na foto..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Botões de upload */}
          <div className="flex gap-2">
            <Button
              onClick={() => cameraInputRef.current?.click()}
              disabled={isUploading}
              className="flex-1"
            >
              <Camera className="h-4 w-4 mr-2" />
              Câmera
            </Button>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex-1"
            >
              <Upload className="h-4 w-4 mr-2" />
              Galeria
            </Button>
          </div>

          {/* Progress bar */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Enviando foto...</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          )}

          {/* Inputs ocultos */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />
        </CardContent>
      </Card>

      {/* Lista de Fotos por Tipo */}
      {PHOTO_TYPES.map((type) => {
        const typePhotos = getPhotosByType(type.value);
        if (typePhotos.length === 0) return null;

        return (
          <Card key={type.value} className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Image className="h-5 w-5" />
                {type.label}
                <Badge className={type.color}>
                  {typePhotos.length} foto{typePhotos.length !== 1 ? 's' : ''}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {typePhotos.map((photo) => (
                  <div key={photo.id} className="relative group">
                    {/* Thumbnail da foto */}
                    <div 
                      className="aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => handlePreviewPhoto(photo)}
                    >
                      <div className="w-full h-full flex items-center justify-center">
                        <Image className="h-8 w-8 text-gray-400" />
                      </div>
                    </div>

                    {/* Overlay com ações */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handlePreviewPhoto(photo)}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleEditDescription(photo)}
                        >
                          <Edit3 className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeletePhoto(photo.id!)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Informações da foto */}
                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-gray-500">
                        {new Date(photo.taken_at || photo.created_at!).toLocaleString('pt-BR')}
                      </p>
                      {photo.file_size && (
                        <p className="text-xs text-gray-400">
                          {formatFileSize(photo.file_size)}
                        </p>
                      )}
                      
                      {/* Descrição editável */}
                      {editingPhoto === photo.id ? (
                        <div className="space-y-1">
                          <Textarea
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            rows={2}
                            className="text-xs"
                          />
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              onClick={() => handleSaveDescription(photo.id!)}
                              className="text-xs h-6"
                            >
                              Salvar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingPhoto(null)}
                              className="text-xs h-6"
                            >
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        photo.description && (
                          <p className="text-xs text-gray-600 line-clamp-2">
                            {photo.description}
                          </p>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Modal de Preview */}
      {previewPhoto && previewUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-full overflow-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{getPhotoTypeInfo(previewPhoto.photo_type).label}</h3>
                <p className="text-sm text-gray-500">
                  {new Date(previewPhoto.taken_at || previewPhoto.created_at!).toLocaleString('pt-BR')}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPreviewPhoto(null);
                  setPreviewUrl('');
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4">
              <img
                src={previewUrl}
                alt={previewPhoto.description || 'Foto do serviço'}
                className="max-w-full max-h-96 mx-auto rounded-lg"
              />
              {previewPhoto.description && (
                <p className="mt-4 text-sm text-gray-600">
                  {previewPhoto.description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Estado vazio */}
      {photos.length === 0 && !isUploading && (
        <Card>
          <CardContent className="py-8 text-center">
            <Camera className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="font-medium text-gray-900 mb-2">Nenhuma foto adicionada</h3>
            <p className="text-gray-500 text-sm mb-4">
              Comece documentando o serviço com fotos organizadas
            </p>
            <Button onClick={() => cameraInputRef.current?.click()}>
              <Camera className="h-4 w-4 mr-2" />
              Adicionar Primeira Foto
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
