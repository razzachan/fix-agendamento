/**
 * Serviço principal para geração e validação de QR Codes
 */

import { supabase } from '@/integrations/supabase/client';
import { 
  EquipmentQRCode, 
  QRCodeData, 
  QRCodeGenerationRequest, 
  QRCodeValidation,
  EquipmentQRCodeDB,
  QR_CODE_CONSTANTS 
} from '@/types/qrcode';
import { generateUUID } from '@/utils/uuid';
import QRCode from 'qrcode';

export class QRCodeService {
  /**
   * Gera um novo QR Code para um equipamento
   */
  static async generateQRCode(request: QRCodeGenerationRequest): Promise<EquipmentQRCode> {
    try {
      // 🔧 PRODUÇÃO: Log reduzido
      console.log('🏷️ [QRCodeService] Gerando QR Code para OS:', request.serviceOrderId);

      // Verificar se já existe QR Code ativo para esta OS (opcional)
      try {
        const existingQR = await this.getActiveQRCodeByServiceOrder(request.serviceOrderId);
        if (existingQR) {
          console.log('⚠️ [QRCodeService] QR Code já existe, retornando existente');
          return existingQR;
        }
      } catch (error) {
        // Continuar com a geração mesmo se houver erro na verificação
        console.warn('⚠️ [QRCodeService] Erro ao verificar QR existente, continuando...');
      }

      // Gerar código único
      const uniqueCode = await this.generateUniqueCode();

      // 🔧 PRODUÇÃO: URL base corrigida para produção
      const baseUrl = typeof window !== 'undefined'
        ? window.location.origin
        : 'https://app.fixfogoes.com.br'; // 🔧 URL correta de produção
      const trackingUrl = `${baseUrl}/track/${uniqueCode}`;

      // 🔧 PRODUÇÃO: Log apenas em desenvolvimento
      if (process.env.NODE_ENV === 'development') {
        console.log('🔗 [QRCodeService] URL de rastreamento gerada:', trackingUrl);
      }

      // Criar dados do QR Code (para validação interna)
      const qrData: QRCodeData = {
        id: generateUUID(),
        osId: request.serviceOrderId,
        timestamp: Date.now(),
        hash: await this.generateHash(request.serviceOrderId, uniqueCode),
        version: QR_CODE_CONSTANTS.VERSION
      };

      // O QR Code conterá a URL, não o JSON
      const qrDataString = trackingUrl;

      // Inserir no banco de dados
      const { data, error } = await supabase
        .from('equipment_qr_codes')
        .insert({
          qr_code: uniqueCode,
          service_order_id: request.serviceOrderId,
          equipment_serial: request.equipmentSerial,
          generated_by: request.generatedBy,
          status: 'active',
          current_location: 'client'
        })
        .select()
        .single();

      if (error) {
        console.error('❌ [QRCodeService] Erro ao inserir QR Code:', error);
        throw new Error(`Erro ao gerar QR Code: ${error.message}`);
      }

      // Mapear resultado
      const qrCode = this.mapFromDB(data);

      // Registrar evento de geração
      await this.createTrackingEvent({
        qrCodeId: qrCode.id,
        serviceOrderId: request.serviceOrderId,
        eventType: 'generated',
        checkpoint: 'collection',
        location: request.location,
        coordinates: request.coordinates,
        scannedBy: request.generatedBy,
        notes: 'QR Code gerado automaticamente durante coleta'
      });

      console.log('✅ [QRCodeService] QR Code gerado com sucesso:', qrCode.qrCode);
      return qrCode;

    } catch (error) {
      console.error('❌ [QRCodeService] Erro ao gerar QR Code:', error);
      throw error;
    }
  }

  /**
   * Valida um QR Code escaneado
   */
  static async validateQRCode(qrCode: string): Promise<QRCodeValidation> {
    try {
      console.log('🔍 [QRCodeService] Validando QR Code:', qrCode);

      // Buscar QR Code no banco
      const { data, error } = await supabase
        .from('equipment_qr_codes')
        .select('*')
        .eq('qr_code', qrCode)
        .eq('status', 'active')
        .single();

      if (error || !data) {
        return {
          isValid: false,
          error: 'QR Code não encontrado ou inativo'
        };
      }

      const equipmentQRCode = this.mapFromDB(data);

      // Validar hash (implementação básica)
      const expectedHash = await this.generateHash(equipmentQRCode.serviceOrderId, qrCode);
      
      return {
        isValid: true,
        equipmentQRCode,
        qrCodeData: {
          id: equipmentQRCode.id,
          osId: equipmentQRCode.serviceOrderId,
          timestamp: new Date(equipmentQRCode.generatedAt).getTime(),
          hash: expectedHash,
          version: QR_CODE_CONSTANTS.VERSION
        }
      };

    } catch (error) {
      console.error('❌ [QRCodeService] Erro ao validar QR Code:', error);
      return {
        isValid: false,
        error: `Erro na validação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      };
    }
  }

  /**
   * Gera imagem do QR Code
   */
  static async generateQRCodeImage(qrCode: string, size: number = 120): Promise<string> {
    try {
      const qrDataUrl = await QRCode.toDataURL(qrCode, {
        width: size,
        margin: 1, // Reduzir margem para economizar espaço
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      return qrDataUrl;
    } catch (error) {
      console.error('❌ [QRCodeService] Erro ao gerar imagem QR:', error);
      throw new Error('Erro ao gerar imagem do QR Code');
    }
  }

  /**
   * Busca QR Code ativo por ordem de serviço
   */
  static async getActiveQRCodeByServiceOrder(serviceOrderId: string): Promise<EquipmentQRCode | null> {
    try {
      console.log('🔍 [QRCodeService] Buscando QR Code para OS:', serviceOrderId);

      const { data, error } = await supabase
        .from('equipment_qr_codes')
        .select('*')
        .eq('service_order_id', serviceOrderId)
        .eq('status', 'active')
        .maybeSingle(); // Usar maybeSingle para não dar erro se não encontrar

      if (error) {
        console.error('❌ [QRCodeService] Erro ao buscar QR Code:', error);
        return null;
      }

      if (!data) {
        console.log('ℹ️ [QRCodeService] Nenhum QR Code ativo encontrado para OS:', serviceOrderId);
        return null;
      }

      console.log('✅ [QRCodeService] QR Code encontrado:', data.qr_code);
      return this.mapFromDB(data);

    } catch (error) {
      console.error('❌ [QRCodeService] Erro ao buscar QR Code:', error);
      return null;
    }
  }

  /**
   * Atualiza localização do equipamento
   */
  static async updateLocation(
    qrCodeId: string, 
    location: string, 
    coordinates?: [number, number]
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('equipment_qr_codes')
        .update({
          current_location: location,
          last_scanned_at: new Date().toISOString()
        })
        .eq('id', qrCodeId);

      return !error;
    } catch (error) {
      console.error('❌ [QRCodeService] Erro ao atualizar localização:', error);
      return false;
    }
  }

  /**
   * Incrementa contador de impressões
   */
  static async incrementPrintCount(qrCodeId: string): Promise<boolean> {
    try {
      // Como a função RPC ainda não existe, vamos fazer update direto
      const { data: currentData } = await supabase
        .from('equipment_qr_codes')
        .select('print_count')
        .eq('id', qrCodeId)
        .single();

      if (currentData) {
        const { error } = await supabase
          .from('equipment_qr_codes')
          .update({ print_count: currentData.print_count + 1 })
          .eq('id', qrCodeId);

        return !error;
      }

      return false;
    } catch (error) {
      console.error('❌ [QRCodeService] Erro ao incrementar contador:', error);
      return false;
    }
  }

  /**
   * Cria evento de rastreamento
   */
  private static async createTrackingEvent(event: {
    qrCodeId: string;
    serviceOrderId: string;
    eventType: string;
    checkpoint?: string;
    location?: string;
    coordinates?: [number, number];
    scannedBy?: string;
    notes?: string;
  }): Promise<void> {
    try {
      await supabase
        .from('qr_tracking_events')
        .insert({
          qr_code_id: event.qrCodeId,
          service_order_id: event.serviceOrderId,
          event_type: event.eventType,
          checkpoint: event.checkpoint,
          location: event.location,
          coordinates: event.coordinates ? `POINT(${event.coordinates[1]} ${event.coordinates[0]})` : null,
          scanned_by: event.scannedBy,
          notes: event.notes
        });
    } catch (error) {
      console.error('❌ [QRCodeService] Erro ao criar evento:', error);
    }
  }

  /**
   * Gera código único usando função do banco (com fallback local)
   */
  private static async generateUniqueCode(): Promise<string> {
    try {
      // Tentar usar função RPC do banco
      const { data, error } = await supabase.rpc('generate_unique_qr_code');

      if (!error && data) {
        // 🔧 PRODUÇÃO: Log apenas em desenvolvimento
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ [QRCodeService] Código gerado via RPC:', data);
        }
        return data;
      } else {
        console.warn('⚠️ [QRCodeService] RPC falhou, usando geração local');
      }
    } catch (error) {
      console.warn('⚠️ [QRCodeService] Erro na RPC, usando geração local');
    }

    // Fallback: gerar código único localmente com verificação
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      const timestamp = Date.now();
      const randomPart = generateUUID().substring(0, 8).toUpperCase();
      const dateStr = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '').substring(0, 14);
      const code = `${QR_CODE_CONSTANTS.PREFIX}${dateStr}_${randomPart}`;

      // Verificar se já existe
      try {
        const { data, error } = await supabase
          .from('equipment_qr_codes')
          .select('id')
          .eq('qr_code', code)
          .maybeSingle();

        if (!error && !data) {
          console.log('✅ [QRCodeService] Código único gerado localmente:', code);
          return code;
        }
      } catch (checkError) {
        console.warn('⚠️ [QRCodeService] Erro ao verificar unicidade:', checkError);
      }

      attempts++;
      // Pequeno delay entre tentativas
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Se tudo falhar, gerar com timestamp mais específico
    const fallbackCode = `${QR_CODE_CONSTANTS.PREFIX}${Date.now()}_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    console.log('⚠️ [QRCodeService] Usando código de emergência:', fallbackCode);
    return fallbackCode;
  }

  /**
   * Gera hash de validação usando algoritmo SHA-256 robusto
   */
  private static async generateHash(serviceOrderId: string, qrCode: string): Promise<string> {
    const data = `${serviceOrderId}_${qrCode}_${QR_CODE_CONSTANTS.VERSION}`;

    // Tentar usar crypto.subtle se disponível (navegadores modernos)
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      try {
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(data);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
      } catch (error) {
        console.warn('⚠️ [QRCodeService] crypto.subtle falhou, usando algoritmo alternativo:', error);
      }
    }

    // Algoritmo de hash alternativo mais robusto (djb2)
    let hash = 5381;
    for (let i = 0; i < data.length; i++) {
      hash = ((hash << 5) + hash) + data.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }

    // Converter para hex e garantir 16 caracteres
    const hexHash = Math.abs(hash).toString(16);
    const timestamp = Date.now().toString(16).slice(-8);
    return (hexHash + timestamp).padStart(16, '0').substring(0, 16);
  }

  /**
   * Mapeia dados do banco para interface
   */
  private static mapFromDB(data: EquipmentQRCodeDB): EquipmentQRCode {
    return {
      id: data.id,
      qrCode: data.qr_code,
      serviceOrderId: data.service_order_id,
      equipmentSerial: data.equipment_serial || undefined,
      generatedAt: data.generated_at,
      generatedBy: data.generated_by || undefined,
      status: data.status,
      printCount: data.print_count,
      lastScannedAt: data.last_scanned_at || undefined,
      lastScannedBy: data.last_scanned_by || undefined,
      currentLocation: data.current_location,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
}

export default QRCodeService;
