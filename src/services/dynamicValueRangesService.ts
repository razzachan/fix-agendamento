/**
 * =====================================================
 * SERVIÇO DE FAIXAS DINÂMICAS DE VALOR
 * =====================================================
 * Gerencia faixas de valor baseadas em dados reais
 * do final_cost das ordens de serviço
 * =====================================================
 */

import { calculateDynamicValueRanges, VALUE_CATEGORY_MAP } from '@/types/googleAdsConversions';

export class DynamicValueRangesService {
  private static cachedRanges: typeof VALUE_CATEGORY_MAP | null = null;
  private static lastUpdate: Date | null = null;
  private static readonly CACHE_DURATION = 60 * 60 * 1000; // 1 hora em ms

  /**
   * Inicializar faixas dinâmicas (chamado no App.tsx)
   */
  static async initialize(): Promise<void> {
    try {
      console.log('🎯 [DynamicRanges] Inicializando faixas dinâmicas...');

      // Versão simplificada para teste
      console.log('🔄 [DynamicRanges] Calculando faixas...');
      const ranges = await calculateDynamicValueRanges();

      this.cachedRanges = ranges;
      this.lastUpdate = new Date();

      console.log('✅ [DynamicRanges] Faixas dinâmicas inicializadas:', {
        baixo: `R$ ${ranges.baixo_valor.min} - R$ ${ranges.baixo_valor.max.toFixed(2)}`,
        medio: `R$ ${ranges.medio_valor.min} - R$ ${ranges.medio_valor.max.toFixed(2)}`,
        alto: `R$ ${ranges.alto_valor.min}+`
      });

      console.log('🎉 [DynamicRanges] Inicialização concluída com sucesso!');

    } catch (error) {
      console.error('❌ [DynamicRanges] Erro ao inicializar:', error);
      console.error('❌ [DynamicRanges] Stack trace:', error.stack);

      // Usar valores padrão em caso de erro
      this.cachedRanges = VALUE_CATEGORY_MAP;
      this.lastUpdate = new Date();

      console.log('⚠️ [DynamicRanges] Usando valores padrão devido ao erro');
    }
  }

  /**
   * Obter faixas dinâmicas (com cache)
   */
  static async getRanges(): Promise<typeof VALUE_CATEGORY_MAP> {
    // Verificar se precisa atualizar cache
    if (!this.cachedRanges || !this.lastUpdate || 
        (Date.now() - this.lastUpdate.getTime()) > this.CACHE_DURATION) {
      
      console.log('🔄 [DynamicRanges] Cache expirado, atualizando...');
      await this.initialize();
    }

    return this.cachedRanges || VALUE_CATEGORY_MAP;
  }

  /**
   * Forçar atualização das faixas
   */
  static async forceUpdate(): Promise<typeof VALUE_CATEGORY_MAP> {
    console.log('🔄 [DynamicRanges] Forçando atualização das faixas...');
    
    this.cachedRanges = null;
    this.lastUpdate = null;
    
    await this.initialize();
    return this.cachedRanges || VALUE_CATEGORY_MAP;
  }

  /**
   * Obter estatísticas das faixas atuais
   */
  static async getStatistics(): Promise<{
    ranges: typeof VALUE_CATEGORY_MAP;
    lastUpdate: Date | null;
    cacheAge: number; // em minutos
  }> {
    const ranges = await this.getRanges();
    const cacheAge = this.lastUpdate 
      ? Math.floor((Date.now() - this.lastUpdate.getTime()) / (1000 * 60))
      : 0;

    return {
      ranges,
      lastUpdate: this.lastUpdate,
      cacheAge
    };
  }

  /**
   * Verificar se uma ordem está nas faixas corretas
   */
  static async validateOrderCategory(
    finalCost: number,
    expectedCategory: 'baixo_valor' | 'medio_valor' | 'alto_valor'
  ): Promise<{
    isCorrect: boolean;
    actualCategory: 'baixo_valor' | 'medio_valor' | 'alto_valor';
    ranges: typeof VALUE_CATEGORY_MAP;
  }> {
    const ranges = await this.getRanges();
    
    let actualCategory: 'baixo_valor' | 'medio_valor' | 'alto_valor';
    
    if (finalCost >= ranges.alto_valor.min) {
      actualCategory = 'alto_valor';
    } else if (finalCost >= ranges.medio_valor.min) {
      actualCategory = 'medio_valor';
    } else {
      actualCategory = 'baixo_valor';
    }

    return {
      isCorrect: actualCategory === expectedCategory,
      actualCategory,
      ranges
    };
  }
}

export default DynamicValueRangesService;
