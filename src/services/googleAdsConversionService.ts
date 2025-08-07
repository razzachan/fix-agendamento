import { supabase } from '@/integrations/supabase/client';

/**
 * Serviço para enviar conversões corretas para o Google Ads
 * Calcula valores reais baseados em initial_cost + estimated_cost
 */
export class GoogleAdsConversionService {
  
  /**
   * Envia conversões para o Google Ads usando valores do campo final_cost
   */
  static async sendConversionsToGoogleAds(): Promise<void> {
    try {
      console.log('🎯 [GoogleAds] Enviando conversões usando final_cost...');

      // 1. Buscar ordens concluídas dos últimos 30 dias
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: orders, error } = await supabase
        .from('service_orders')
        .select(`
          id,
          order_number,
          client_name,
          final_cost,
          conversion_value,
          status,
          completed_date,
          conversion_time,
          service_attendance_type,
          gclid,
          utm_source,
          utm_medium,
          utm_campaign,
          utm_term,
          utm_content
        `)
        .eq('status', 'completed')
        .gte('completed_date', thirtyDaysAgo.toISOString())
        .order('completed_date', { ascending: false });

      if (error) {
        console.error('❌ Erro ao buscar ordens:', error);
        return;
      }

      if (!orders || orders.length === 0) {
        console.log('ℹ️ Nenhuma ordem concluída encontrada nos últimos 30 dias');
        return;
      }

      console.log(`📋 Encontradas ${orders.length} ordens concluídas para enviar`);

      // 2. Processar cada ordem usando final_cost diretamente
      const conversions = orders.map(order => ({
        orderId: order.id,
        orderNumber: order.order_number,
        clientName: order.client_name,
        conversionValue: parseFloat(order.final_cost || '0'),
        conversionTime: order.completed_date,
        serviceType: order.service_attendance_type,
        gclid: order.gclid,
        utmSource: order.utm_source,
        utmMedium: order.utm_medium,
        utmCampaign: order.utm_campaign,
        utmTerm: order.utm_term,
        utmContent: order.utm_content
      }));

      // 3. Enviar para Google Ads (simulação - implementar API real)
      await this.uploadToGoogleAds(conversions);

      console.log(`✅ ${conversions.length} conversões enviadas para Google Ads`);

    } catch (error) {
      console.error('❌ Erro ao enviar conversões:', error);
    }
  }

  /**
   * Calcula o valor correto da conversão baseado na lógica:
   * - Se há diagnóstico: initial_cost + estimated_cost
   * - Se não há diagnóstico: initial_cost ou final_cost
   * - Valores mínimos realistas para assistência técnica
   */
  private static calculateCorrectConversionValue(order: any): number {
    const initialCost = order.initial_cost || 0;
    const finalCost = order.final_cost || 0;
    const estimatedCost = order.equipment_diagnostics?.[0]?.estimated_cost || 0;
    
    let conversionValue = 0;
    
    // Lógica de cálculo
    if (estimatedCost > 0) {
      // Há diagnóstico: initial_cost + estimated_cost
      conversionValue = initialCost + estimatedCost;
    } else if (finalCost > 0) {
      // Usar final_cost se disponível
      conversionValue = finalCost;
    } else if (initialCost > 0) {
      // Usar initial_cost como fallback
      conversionValue = initialCost;
    } else {
      // Valor mínimo realista baseado no tipo de serviço
      conversionValue = this.getMinimumValueByServiceType(order.service_attendance_type);
    }
    
    // Garantir valor mínimo realista
    const minimumValue = this.getMinimumValueByServiceType(order.service_attendance_type);
    return Math.max(conversionValue, minimumValue);
  }

  /**
   * Retorna valores mínimos realistas por tipo de serviço
   */
  private static getMinimumValueByServiceType(serviceType: string): number {
    const minimumValues = {
      'em_domicilio': 180,        // Serviço em domicílio
      'coleta_conserto': 350,     // Coleta para conserto
      'coleta_diagnostico': 150   // Coleta para diagnóstico
    };
    
    return minimumValues[serviceType as keyof typeof minimumValues] || 200;
  }

  /**
   * Simula o upload para Google Ads usando dados reais do final_cost
   * Na implementação real, usar a API do Google Ads
   */
  private static async uploadToGoogleAds(conversions: any[]): Promise<void> {
    console.log('📤 [GoogleAds] Enviando conversões com valores do final_cost...');

    let totalValue = 0;

    for (const conversion of conversions) {
      totalValue += conversion.conversionValue;

      console.log(`
🔄 CONVERSÃO GOOGLE ADS:
📋 Ordem: ${conversion.orderNumber || conversion.orderId.substring(0, 8)}
👤 Cliente: ${conversion.clientName}
💰 Valor final_cost: R$ ${conversion.conversionValue.toFixed(2)}
📅 Data conversão: ${new Date(conversion.conversionTime).toLocaleDateString('pt-BR')}
🔧 Tipo serviço: ${conversion.serviceType}
🎯 GCLID: ${conversion.gclid || 'N/A'}
📊 UTM Source: ${conversion.utmSource || 'N/A'}
📈 UTM Campaign: ${conversion.utmCampaign || 'N/A'}
${'─'.repeat(60)}`);

      // Aqui seria a chamada real para a API do Google Ads
      // await googleAdsApi.uploadConversion({
      //   gclid: conversion.gclid,
      //   conversionValue: conversion.conversionValue,
      //   conversionTime: conversion.conversionTime,
      //   orderId: conversion.orderId
      // });
    }

    console.log(`
✅ [GoogleAds] RESUMO DO UPLOAD:
📊 Total conversões: ${conversions.length}
💰 Valor total: R$ ${totalValue.toFixed(2)}
💵 Valor médio: R$ ${(totalValue / conversions.length).toFixed(2)}
🎯 Dados baseados no campo final_cost
`);
  }

  /**
   * Gera relatório de conversões usando valores do final_cost
   */
  static async generateConversionsReport(): Promise<void> {
    try {
      console.log('📊 [GoogleAds] Gerando relatório usando final_cost...');

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: orders, error } = await supabase
        .from('service_orders')
        .select(`
          id,
          order_number,
          client_name,
          final_cost,
          conversion_value,
          status,
          completed_date,
          service_attendance_type,
          gclid,
          utm_source,
          utm_campaign
        `)
        .eq('status', 'completed')
        .gte('completed_date', thirtyDaysAgo.toISOString())
        .order('completed_date', { ascending: false });

      if (error) {
        console.error('❌ Erro ao buscar ordens:', error);
        return;
      }

      if (!orders || orders.length === 0) {
        console.log('ℹ️ Nenhuma ordem concluída encontrada');
        return;
      }

      console.log('\n📋 RELATÓRIO CONVERSÕES GOOGLE ADS (final_cost):');
      console.log('='.repeat(80));

      let totalValue = 0;

      for (const order of orders) {
        const conversionValue = parseFloat(order.final_cost || '0');
        totalValue += conversionValue;

        console.log(`
🔍 Ordem: ${order.order_number || order.id.substring(0, 8)}
👤 Cliente: ${order.client_name}
💰 final_cost: R$ ${conversionValue.toFixed(2)}
📅 Concluída: ${new Date(order.completed_date).toLocaleDateString('pt-BR')}
🔧 Tipo: ${order.service_attendance_type}
🎯 GCLID: ${order.gclid || 'N/A'}
📊 UTM: ${order.utm_source || 'N/A'} / ${order.utm_campaign || 'N/A'}
${'─'.repeat(50)}`);
      }

      console.log(`
📊 RESUMO FINAL:
🔢 Total conversões: ${orders.length}
💰 Valor total: R$ ${totalValue.toFixed(2)}
💵 Valor médio: R$ ${(totalValue / orders.length).toFixed(2)}
✅ Dados prontos para Google Ads
`);

    } catch (error) {
      console.error('❌ Erro ao gerar relatório:', error);
    }
  }

  /**
   * Testa o cálculo de valores com dados simulados
   */
  static testValueCalculation(): void {
    console.log('🧪 [GoogleAds] Testando cálculo de valores...');
    
    const testOrders = [
      {
        id: 'test-1',
        initial_cost: 150,
        final_cost: 0,
        service_attendance_type: 'coleta_diagnostico',
        equipment_diagnostics: []
      },
      {
        id: 'test-2', 
        initial_cost: 350,
        final_cost: 850,
        service_attendance_type: 'coleta_conserto',
        equipment_diagnostics: [{ estimated_cost: 500 }]
      },
      {
        id: 'test-3',
        initial_cost: 0,
        final_cost: 0,
        service_attendance_type: 'em_domicilio',
        equipment_diagnostics: []
      }
    ];
    
    testOrders.forEach(order => {
      const value = this.calculateCorrectConversionValue(order);
      console.log(`Ordem ${order.id}: R$ ${value}`);
    });
  }
}
