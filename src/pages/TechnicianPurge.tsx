
import React, { useState } from 'react';
import { technicianBulkService } from '@/services';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TechnicianPurge: React.FC = () => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [result, setResult] = useState<{ deleted: number, errors: number } | null>(null);
  const navigate = useNavigate();
  
  const handleDeleteTechnicians = async () => {
    const confirmDelete = window.confirm(
      "ATENÇÃO: Esta ação excluirá permanentemente todos os técnicos exceto Paulo Cesar Betoni. Esta ação não pode ser desfeita. Deseja continuar?"
    );
    
    if (!confirmDelete) return;
    
    setIsDeleting(true);
    try {
      const result = await technicianBulkService.deleteAllExcept("Paulo Cesar Betoni");
      setResult(result);
      
      if (result.deleted > 0 && result.errors === 0) {
        toast.success(`${result.deleted} técnicos foram excluídos com sucesso.`);
      } else if (result.deleted > 0 && result.errors > 0) {
        toast.warning(`${result.deleted} técnicos excluídos, mas houve ${result.errors} erros.`);
      } else if (result.deleted === 0 && result.errors === 0) {
        toast.info("Nenhum técnico para excluir.");
      } else {
        toast.error(`Falha ao excluir técnicos. Houve ${result.errors} erros.`);
      }
    } catch (error) {
      console.error("Erro ao excluir técnicos:", error);
      toast.error("Erro ao excluir técnicos. Verifique o console para mais detalhes.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-6 w-6 text-red-500" />
            Exclusão em Massa de Técnicos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-md p-4 text-amber-800">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium">Atenção!</p>
                <p className="text-sm">
                  Esta ferramenta excluirá TODOS os técnicos do banco de dados, 
                  exceto "Paulo Cesar Betoni". Essa ação não pode ser desfeita.
                </p>
              </div>
            </div>
          </div>

          {result && (
            <div className={`border rounded-md p-4 ${
              result.errors > 0 ? 'bg-red-50 border-red-200 text-red-800' : 'bg-green-50 border-green-200 text-green-800'
            }`}>
              <p className="font-medium">Resultado da operação:</p>
              <ul className="list-disc list-inside text-sm mt-1">
                <li>Técnicos excluídos: {result.deleted}</li>
                <li>Erros encontrados: {result.errors}</li>
              </ul>
            </div>
          )}

          <div className="flex justify-between mt-6">
            <Button
              variant="outline" 
              onClick={() => navigate('/technicians')}
            >
              Voltar
            </Button>
            <Button 
              variant="destructive"
              disabled={isDeleting} 
              onClick={handleDeleteTechnicians}
            >
              {isDeleting ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Excluindo...
                </>
              ) : (
                <>Excluir Todos os Técnicos</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TechnicianPurge;
