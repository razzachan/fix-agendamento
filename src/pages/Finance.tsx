
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, TrendingDown, AlertCircle, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppData } from '@/hooks/useAppData';
import { FinancialAnalytics } from '@/components/finance/FinancialAnalytics';
import FinancialInconsistencyReport from '@/components/finance/FinancialInconsistencyReport';

const Finance: React.FC = () => {
  const { financialTransactions, isLoading } = useAppData();
  
  // Calculate totals
  const totalIncome = financialTransactions
    .filter(tx => tx.type === 'income')
    .reduce((sum, tx) => sum + tx.amount, 0);
  
  const totalExpense = financialTransactions
    .filter(tx => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0);
  
  const netProfit = totalIncome - totalExpense;
  
  const pendingIncome = financialTransactions
    .filter(tx => tx.type === 'income' && tx.paidStatus === 'pending')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  const getPaidStatusStyle = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'overdue':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPaidStatusLabel = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Pago';
      case 'pending':
        return 'Pendente';
      case 'overdue':
        return 'Atrasado';
      default:
        return status;
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Financeiro</h1>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Financeiro</h1>
        <Button>
          <DollarSign className="h-4 w-4 mr-2" /> Nova Transação
        </Button>
      </div>



      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="transactions">Transações</TabsTrigger>
          <TabsTrigger value="inconsistencies">
            <AlertCircle className="h-4 w-4 mr-2" />
            Inconsistências
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          {/* Cards de métricas - conteúdo existente */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalIncome)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Despesas</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalExpense)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Lucro Líquido</CardTitle>
                <DollarSign className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(netProfit)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">A Receber</CardTitle>
                <AlertCircle className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(pendingIncome)}</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <FinancialAnalytics />
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                {financialTransactions.length > 0 ? (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Descrição</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Categoria</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Data</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Valor</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {financialTransactions.map((transaction) => (
                        <tr key={transaction.id} className="border-b last:border-0 hover:bg-muted/50">
                          <td className="py-3 px-4">{transaction.description}</td>
                          <td className="py-3 px-4">{transaction.category}</td>
                          <td className="py-3 px-4">{formatDate(transaction.date)}</td>
                          <td className="py-3 px-4">
                            <span className={transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                              {transaction.type === 'income' ? '+' : '-'} {formatCurrency(transaction.amount)}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              variant="outline"
                              className={getPaidStatusStyle(transaction.paidStatus)}
                            >
                              {getPaidStatusLabel(transaction.paidStatus)}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Não há transações financeiras registradas.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="income">
          <Card>
            <CardHeader>
              <CardTitle>Receitas</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                {financialTransactions.filter(tx => tx.type === 'income').length > 0 ? (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Descrição</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Categoria</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Data</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Valor</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {financialTransactions
                        .filter(tx => tx.type === 'income')
                        .map((transaction) => (
                          <tr key={transaction.id} className="border-b last:border-0 hover:bg-muted/50">
                            <td className="py-3 px-4">{transaction.description}</td>
                            <td className="py-3 px-4">{transaction.category}</td>
                            <td className="py-3 px-4">{formatDate(transaction.date)}</td>
                            <td className="py-3 px-4">
                              <span className="text-green-600">
                                + {formatCurrency(transaction.amount)}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <Badge
                                variant="outline"
                                className={getPaidStatusStyle(transaction.paidStatus)}
                              >
                                {getPaidStatusLabel(transaction.paidStatus)}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Não há receitas registradas.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="expense">
          <Card>
            <CardHeader>
              <CardTitle>Despesas</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                {financialTransactions.filter(tx => tx.type === 'expense').length > 0 ? (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Descrição</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Categoria</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Data</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Valor</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {financialTransactions
                        .filter(tx => tx.type === 'expense')
                        .map((transaction) => (
                          <tr key={transaction.id} className="border-b last:border-0 hover:bg-muted/50">
                            <td className="py-3 px-4">{transaction.description}</td>
                            <td className="py-3 px-4">{transaction.category}</td>
                            <td className="py-3 px-4">{formatDate(transaction.date)}</td>
                            <td className="py-3 px-4">
                              <span className="text-red-600">
                                - {formatCurrency(transaction.amount)}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <Badge
                                variant="outline"
                                className={getPaidStatusStyle(transaction.paidStatus)}
                              >
                                {getPaidStatusLabel(transaction.paidStatus)}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Não há despesas registradas.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inconsistencies">
          <FinancialInconsistencyReport />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Finance;
