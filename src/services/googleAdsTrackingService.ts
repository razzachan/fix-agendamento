import { supabase } from '@/integrations/supabase/client';
import { GoogleAdsConversion, ConversionExportData } from '@/types';
import {
  ConversionType,
  ConversionStrategy,
  generateConversionStrategy,
  generateConversionStrategyDynamic,
  GOOGLE_ADS_CONVERSION_NAMES
} from '@/types/googleAdsConversions';

export class GoogleAdsTrackingService {
  /**
   * Captura parâmetros UTM e GCLID da URL
   */
  static captureTrackingParams(): {
    gclid?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmTerm?: string;
    utmContent?: string;
  } {
    if (typeof window === 'undefined') return {};

    const urlParams = new URLSearchParams(window.location.search);
    
    const trackingParams = {
      gclid: urlParams.get('gclid') || undefined,
      utmSource: urlParams.get('utm_source') || undefined,
      utmMedium: urlParams.get('utm_medium') || undefined,
      utmCampaign: urlParams.get('utm_campaign') || undefined,
      utmTerm: urlParams.get('utm_term') || undefined,
      utmContent: urlParams.get('utm_content') || undefined,
    };

    // Salvar no localStorage para persistir durante a sessão
    if (trackingParams.gclid || trackingParams.utmSource) {
      localStorage.setItem('trackingParams', JSON.stringify(trackingParams));
    }

    return trackingParams;
  }

  /**
   * Recupera parâmetros de tracking salvos no localStorage
   */
  static getStoredTrackingParams(): {
    gclid?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmTerm?: string;
    utmContent?: string;
  } {
    if (typeof window === 'undefined') return {};

    try {
      const stored = localStorage.getItem('trackingParams');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  /**
   * 🎯 REGISTRA CONVERSÕES INTELIGENTES (MÚLTIPLAS CATEGORIAS)
   *
   * ESTRATÉGIA:
   * ✅ GOOGLE ADS: Recebe apenas conversões categorizadas simples
   * ✅ NOSSO BANCO: Armazena todos os dados detalhados para análise
   */
  static async recordSmartConversion(
    serviceOrderId: string,
    equipmentDescription: string,
    conversionValue: number,
    siteDomain: string = '',
    detailedData?: {
      // Dados para análise interna (salvos no nosso banco)
      equipmentBrand?: string;
      equipmentModel?: string;
      problemDescription?: string;
      clientName?: string;
      clientPhone?: string;
      clientCity?: string;
      serviceType?: 'diagnostico' | 'conserto' | 'manutencao';
      initialCost?: number;
      finalCost?: number;
      technicianName?: string;
      leadSource?: 'google_ads' | 'whatsapp' | 'indicacao';
    }
  ): Promise<boolean> {
    try {
      // 🎯 GERAR ESTRATÉGIA DE CONVERSÕES INTELIGENTE (DINÂMICA)
      const strategy = await generateConversionStrategyDynamic(
        equipmentDescription,
        conversionValue,
        siteDomain
      );

      console.log('🎯 Estratégia de conversões dinâmica para Google Ads:', strategy);
      console.log('📊 Dados detalhados salvos no banco:', detailedData);

      let allSuccess = true;

      // 🎯 REGISTRAR CONVERSÃO PRINCIPAL (SEMPRE)
      // Envia para Google Ads: apenas nome da conversão + valor + GCLID
      const primarySuccess = await this.recordConversion(
        serviceOrderId,
        strategy.primary,
        conversionValue,
        equipmentDescription,
        detailedData // Dados detalhados salvos no nosso banco
      );
      allSuccess = allSuccess && primarySuccess;

      // 🎯 REGISTRAR CONVERSÃO POR EQUIPAMENTO (SE DIFERENTE DA PRINCIPAL)
      if (strategy.equipment && strategy.equipment !== strategy.primary) {
        const equipmentSuccess = await this.recordConversion(
          serviceOrderId,
          strategy.equipment,
          conversionValue,
          equipmentDescription,
          detailedData // Dados detalhados para nosso banco
        );
        allSuccess = allSuccess && equipmentSuccess;
      }

      // 🎯 REGISTRAR CONVERSÃO POR VALOR (PARA ANÁLISE DE ROI)
      if (strategy.value) {
        const valueSuccess = await this.recordConversion(
          serviceOrderId,
          strategy.value,
          conversionValue,
          equipmentDescription,
          detailedData // Dados detalhados para nosso banco
        );
        allSuccess = allSuccess && valueSuccess;
      }

      // 🎯 REGISTRAR CONVERSÃO POR SITE (SE MÚLTIPLOS SITES)
      if (strategy.site) {
        const siteSuccess = await this.recordConversion(
          serviceOrderId,
          strategy.site,
          conversionValue,
          equipmentDescription,
          detailedData // Dados detalhados para nosso banco
        );
        allSuccess = allSuccess && siteSuccess;
      }

      return allSuccess;

    } catch (error) {
      console.error('❌ Erro ao registrar conversões inteligentes:', error);
      return false;
    }
  }

  /**
   * Registra uma conversão no banco de dados com dados detalhados
   * Para coleta diagnóstico/conserto, verifica se já existe conversão para atualizar
   */
  static async recordConversion(
    serviceOrderId: string,
    conversionType: ConversionType,
    conversionValue: number,
    equipmentType?: string,
    additionalData?: {
      equipmentBrand?: string;
      equipmentModel?: string;
      problemDescription?: string;
      clientName?: string;
      clientPhone?: string;
      clientCity?: string;
      technicianName?: string;
      serviceAttendanceType?: string;
      initialCost?: number;
      finalCost?: number;
      parentOrderId?: string; // Para vincular com ordem original
      isSecondPhase?: boolean; // Indica se é segunda fase (conserto após diagnóstico)
    }
  ): Promise<boolean> {
    try {
      const trackingParams = this.getStoredTrackingParams();

      // Só registra se tiver GCLID (veio do Google Ads)
      if (!trackingParams.gclid) {
        console.log('Nenhum GCLID encontrado - não é uma conversão do Google Ads');
        return false;
      }

      // Para segunda fase (conserto após diagnóstico), atualizar conversão existente
      if (additionalData?.isSecondPhase && additionalData?.parentOrderId) {
        return await this.updateExistingConversion(
          additionalData.parentOrderId,
          conversionType,
          conversionValue,
          additionalData
        );
      }

      const conversionName = this.getConversionName(conversionType, equipmentType);

      // Calcular margem de lucro se tiver custos
      const profitMargin = additionalData?.finalCost && additionalData?.initialCost
        ? ((additionalData.finalCost - additionalData.initialCost) / additionalData.finalCost) * 100
        : null;

      const { error } = await supabase
        .from('google_ads_conversions')
        .insert({
          service_order_id: serviceOrderId,
          gclid: trackingParams.gclid,
          conversion_name: conversionName,
          conversion_time: new Date().toISOString(),
          conversion_value: conversionValue,
          conversion_currency: 'BRL',
          order_id: `OS-${serviceOrderId.slice(0, 8)}`,
          equipment_type: equipmentType,
          service_type: conversionType,
          exported: false,
          // Dados detalhados do equipamento
          equipment_brand: additionalData?.equipmentBrand,
          equipment_model: additionalData?.equipmentModel,
          problem_description: additionalData?.problemDescription,
          // Dados do cliente
          client_name: additionalData?.clientName,
          client_phone: additionalData?.clientPhone,
          client_city: this.extractCityFromAddress(additionalData?.problemDescription), // Extrair de endereço se disponível
          // Dados do serviço
          technician_name: additionalData?.technicianName,
          service_attendance_type: additionalData?.serviceAttendanceType,
          initial_cost: additionalData?.initialCost,
          final_cost: additionalData?.finalCost,
          profit_margin: profitMargin,
          // Dados de tracking
          utm_source: trackingParams.utmSource,
          utm_medium: trackingParams.utmMedium,
          utm_campaign: trackingParams.utmCampaign,
          utm_term: trackingParams.utmTerm,
          utm_content: trackingParams.utmContent
        });

      if (error) {
        console.error('Erro ao registrar conversão:', error);
        return false;
      }

      console.log(`✅ Conversão registrada: ${conversionName} - R$ ${conversionValue}`);
      return true;
    } catch (error) {
      console.error('Erro ao registrar conversão:', error);
      return false;
    }
  }

  /**
   * Gera nome da conversão baseado no tipo e equipamento
   */
  private static getConversionName(conversionType: ConversionType, equipmentType?: string): string {
    const conversionNames: Record<ConversionType, string> = {
      lead_gerado: 'Lead_Gerado',
      agendamento: 'Agendamento',
      servico_iniciado: 'Servico_Iniciado',
      orcamento_aprovado: 'Orcamento_Aprovado',
      servico_concluido: 'Servico_Concluido',
      pagamento_recebido: 'Pagamento_Recebido',
      fogao_4_bocas_concluido: 'Fogao_4_Bocas_Concluido',
      fogao_6_bocas_concluido: 'Fogao_6_Bocas_Concluido',
      cooktop_concluido: 'Cooktop_Concluido',
      forno_concluido: 'Forno_Concluido'
    };

    // Se for conclusão de serviço, usar nome específico por equipamento
    if (conversionType === 'servico_concluido' && equipmentType) {
      const equipmentLower = equipmentType.toLowerCase();
      if (equipmentLower.includes('fogão 4') || equipmentLower.includes('fogao 4')) {
        return 'Fogao_4_Bocas_Concluido';
      } else if (equipmentLower.includes('fogão 6') || equipmentLower.includes('fogao 6')) {
        return 'Fogao_6_Bocas_Concluido';
      } else if (equipmentLower.includes('cooktop')) {
        return 'Cooktop_Concluido';
      } else if (equipmentLower.includes('forno')) {
        return 'Forno_Concluido';
      }
    }

    return conversionNames[conversionType] || 'Conversao_Generica';
  }

  /**
   * Busca conversões para exportação
   */
  static async getConversionsForExport(
    startDate: string,
    endDate: string,
    onlyNotExported: boolean = true
  ): Promise<ConversionExportData[]> {
    try {
      let query = supabase
        .from('google_ads_conversions')
        .select('*')
        .gte('conversion_time', startDate)
        .lte('conversion_time', endDate)
        .order('conversion_time', { ascending: true });

      if (onlyNotExported) {
        query = query.eq('exported', false);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar conversões:', error);
        return [];
      }

      return (data || []).map(conversion => ({
        googleClickId: conversion.gclid,
        conversionName: conversion.conversion_name,
        conversionTime: this.formatConversionTime(conversion.conversion_time),
        conversionValue: conversion.conversion_value,
        conversionCurrency: conversion.conversion_currency,
        orderId: conversion.order_id
      }));
    } catch (error) {
      console.error('Erro ao buscar conversões:', error);
      return [];
    }
  }

  /**
   * Formata data/hora para o formato do Google Ads
   */
  private static formatConversionTime(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).replace(' ', ' ') + ' America/Sao_Paulo';
  }

  /**
   * Marca conversões como exportadas
   */
  static async markAsExported(conversionIds: string[]): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('google_ads_conversions')
        .update({ exported: true, updated_at: new Date().toISOString() })
        .in('id', conversionIds);

      if (error) {
        console.error('Erro ao marcar conversões como exportadas:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro ao marcar conversões como exportadas:', error);
      return false;
    }
  }

  /**
   * Gera arquivo CSV para upload no Google Ads
   */
  static generateCSV(conversions: ConversionExportData[]): string {
    const headers = [
      'Google Click ID',
      'Conversion Name',
      'Conversion Time',
      'Conversion Value',
      'Conversion Currency',
      'Order ID'
    ];

    const rows = conversions.map(conv => [
      conv.googleClickId,
      conv.conversionName,
      conv.conversionTime,
      conv.conversionValue.toString(),
      conv.conversionCurrency,
      conv.orderId || ''
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    return csvContent;
  }

  /**
   * Atualiza conversão existente para segunda fase (conserto após diagnóstico)
   * Agora usa o serviço de relacionamento para encontrar a ordem pai real
   */
  private static async updateExistingConversion(
    currentOrderId: string,
    conversionType: ConversionType,
    newConversionValue: number,
    additionalData: any
  ): Promise<boolean> {
    try {
      // Importar serviço de relacionamento
      const { OrderRelationshipService } = await import('./orderRelationshipService');

      // Buscar histórico da ordem para encontrar a ordem pai
      const history = await OrderRelationshipService.getOrderHistory(currentOrderId);

      if (!history || !history.parentOrder) {
        console.log('Ordem pai não encontrada, criando nova conversão');
        return false; // Vai criar nova conversão
      }

      // Buscar conversão existente da ordem pai
      const { data: existingConversion, error: searchError } = await supabase
        .from('google_ads_conversions')
        .select('*')
        .eq('service_order_id', history.parentOrder.id)
        .eq('conversion_name', 'Agendamento') // Conversão inicial
        .single();

      if (searchError || !existingConversion) {
        console.log('Conversão original não encontrada, criando nova');
        return false; // Vai criar nova conversão
      }

      // Calcular valor total usando serviço de relacionamento
      const familyTotal = OrderRelationshipService.calculateFamilyTotal(
        history.parentOrder,
        history.childOrders
      );

      const totalValue = familyTotal.totalFinal || (existingConversion.conversion_value || 0) + newConversionValue;
      const newConversionName = this.getConversionName(conversionType, additionalData?.equipmentType);

      // Atualizar conversão existente
      const { error: updateError } = await supabase
        .from('google_ads_conversions')
        .update({
          conversion_name: newConversionName, // Muda de "Agendamento" para "Servico_Concluido"
          conversion_value: totalValue, // Valor total (sinal + conserto)
          conversion_time: new Date().toISOString(), // Atualiza para data de conclusão
          final_cost: additionalData?.finalCost,
          technician_name: additionalData?.technicianName,
          completion_days: this.calculateCompletionDays(existingConversion.conversion_time),
          updated_at: new Date().toISOString(),
          exported: false // Marcar para reexportar
        })
        .eq('id', existingConversion.id);

      if (updateError) {
        console.error('Erro ao atualizar conversão:', updateError);
        return false;
      }

      console.log(`✅ Conversão atualizada: ${existingConversion.conversion_name} → ${newConversionName} - R$ ${totalValue}`);
      return true;

    } catch (error) {
      console.error('Erro ao atualizar conversão existente:', error);
      return false;
    }
  }

  /**
   * Calcula dias para conclusão
   */
  private static calculateCompletionDays(startTime: string): number {
    const start = new Date(startTime);
    const end = new Date();
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Extrai cidade do endereço (função auxiliar)
   */
  private static extractCityFromAddress(address?: string): string | null {
    if (!address) return null;

    // Regex simples para extrair cidade (assumindo formato brasileiro)
    const cityMatch = address.match(/,\s*([^,]+)\s*-\s*[A-Z]{2}/);
    return cityMatch ? cityMatch[1].trim() : null;
  }

  /**
   * Faz download do arquivo CSV
   */
  static downloadCSV(csvContent: string, filename: string = 'google-ads-conversions.csv'): void {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  /**
   * Salva parâmetros de tracking no agendamento (para uso no middleware)
   */
  static async saveTrackingToAgendamento(agendamentoId: string): Promise<boolean> {
    try {
      const trackingParams = this.getStoredTrackingParams();

      if (!trackingParams.gclid && !trackingParams.utmSource) {
        console.log('Nenhum parâmetro de tracking encontrado');
        return false;
      }

      const { error } = await supabase
        .from('agendamentos_ai')
        .update({
          gclid: trackingParams.gclid,
          utm_source: trackingParams.utmSource,
          utm_medium: trackingParams.utmMedium,
          utm_campaign: trackingParams.utmCampaign,
          utm_term: trackingParams.utmTerm,
          utm_content: trackingParams.utmContent,
          updated_at: new Date().toISOString()
        })
        .eq('id', agendamentoId);

      if (error) {
        console.error('Erro ao salvar tracking no agendamento:', error);
        return false;
      }

      console.log('✅ Tracking salvo no agendamento:', agendamentoId);
      return true;
    } catch (error) {
      console.error('Erro ao salvar tracking no agendamento:', error);
      return false;
    }
  }

  /**
   * Registra conversão de lead gerado (primeiro contato via middleware)
   */
  static async recordLeadConversion(agendamentoId: string): Promise<boolean> {
    try {
      const trackingParams = this.getStoredTrackingParams();

      if (!trackingParams.gclid) {
        console.log('Nenhum GCLID encontrado - não é uma conversão do Google Ads');
        return false;
      }

      const { error } = await supabase
        .from('google_ads_conversions')
        .insert({
          service_order_id: null, // Ainda não tem OS
          gclid: trackingParams.gclid,
          conversion_name: 'Lead_Gerado',
          conversion_time: new Date().toISOString(),
          conversion_value: 0, // Lead não tem valor monetário
          conversion_currency: 'BRL',
          order_id: `AG-${agendamentoId.slice(0, 8)}`,
          equipment_type: null,
          service_type: 'lead_gerado',
          exported: false
        });

      if (error) {
        console.error('Erro ao registrar conversão de lead:', error);
        return false;
      }

      console.log('✅ Conversão de lead registrada para agendamento:', agendamentoId);
      return true;
    } catch (error) {
      console.error('Erro ao registrar conversão de lead:', error);
      return false;
    }
  }
}
