
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { InfoIcon, AlertTriangle } from 'lucide-react';
import { checkAllAccounts, fixSpecialAccounts } from '@/services/user/auth/adminTools';

const AccountsDebugPanel = () => {
  const [accounts, setAccounts] = useState<{
    profiles: any[] | null;
    users: any[] | null;
    technicians: any[] | null;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleCheckAccounts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await checkAllAccounts();
      if (result.error) {
        setError(`Error checking accounts: ${result.error}`);
      } else {
        setAccounts({
          profiles: result.profiles || [],
          users: result.users || [],
          technicians: result.technicians || []
        });
      }
    } catch (err) {
      setError(`Error: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFixSpecialAccounts = async () => {
    setIsLoading(true);
    setMessage(null);
    setError(null);
    try {
      const result = await fixSpecialAccounts();
      setMessage(result);
    } catch (err) {
      setError(`Error: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Debug de Contas</CardTitle>
        <CardDescription>
          Painel administrativo para verificação e correção de contas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={handleCheckAccounts} 
            disabled={isLoading}
            variant="outline"
          >
            Verificar Contas
          </Button>
          <Button 
            onClick={handleFixSpecialAccounts}
            disabled={isLoading}
            variant="secondary"
          >
            Corrigir Contas Especiais
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Erro</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {message && (
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertTitle>Informação</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        {accounts && (
          <Tabs defaultValue="profiles" className="w-full">
            <TabsList className="grid grid-cols-3 mb-2">
              <TabsTrigger value="profiles">Profiles ({accounts.profiles?.length || 0})</TabsTrigger>
              <TabsTrigger value="users">Legacy Users ({accounts.users?.length || 0})</TabsTrigger>
              <TabsTrigger value="technicians">Técnicos ({accounts.technicians?.length || 0})</TabsTrigger>
            </TabsList>
            <TabsContent value="profiles" className="max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="text-left p-2">Nome</th>
                    <th className="text-left p-2">Email</th>
                    <th className="text-left p-2">Função</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.profiles?.map((profile: any) => (
                    <tr key={profile.id} className="border-b border-gray-100">
                      <td className="p-2">{profile.name}</td>
                      <td className="p-2">{profile.email}</td>
                      <td className="p-2">{profile.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TabsContent>
            <TabsContent value="users" className="max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="text-left p-2">Nome</th>
                    <th className="text-left p-2">Email</th>
                    <th className="text-left p-2">Função</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.users?.map((user: any) => (
                    <tr key={user.id} className="border-b border-gray-100">
                      <td className="p-2">{user.name}</td>
                      <td className="p-2">{user.email}</td>
                      <td className="p-2">{user.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TabsContent>
            <TabsContent value="technicians" className="max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="text-left p-2">Nome</th>
                    <th className="text-left p-2">Email</th>
                    <th className="text-left p-2">Telefone</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.technicians?.map((tech: any) => (
                    <tr key={tech.id} className="border-b border-gray-100">
                      <td className="p-2">{tech.name}</td>
                      <td className="p-2">{tech.email}</td>
                      <td className="p-2">{tech.phone || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};

export default AccountsDebugPanel;
