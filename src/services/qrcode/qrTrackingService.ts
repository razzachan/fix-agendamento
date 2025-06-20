/**
 * Serviço para rastreamento e histórico de QR Codes
 */

import { supabase } from '@/integrations/supabase/client';
import { 
  QRTrackingEvent, 
  QRCodeScanRequest, 
  QRCodeScanResponse, 
  TrackingHistory,
  QRTrackingEventDB,
  TrackingCheckpoint,
  EquipmentLocation
} from '@/types/qrcode';
import { QRCodeService } from './qrCodeService';

export class QRTrackingService {
  /**
   * Processa escaneamento de QR Code
   */
  static async processQRCodeScan(request: QRCodeScanRequest): Promise<QRCodeScanResponse> {
    try {
      console.log('📱 [QRTrackingService] Processando escaneamento:', request.qrCode);

      // Validar QR Code
      const validation = await QRCodeService.validateQRCode(request.qrCode);
      
      if (!validation.isValid || !validation.equipmentQRCode) {
        return {
          success: false,
          message: validation.error || 'QR Code inválido'
        };
      }

      const qrCodeData = validation.equipmentQRCode;

      // Verificar se é um escaneamento duplicado recente (últimos 5 minutos)
      const isDuplicate = await this.checkDuplicateScan(
        qrCodeData.id, 
        request.checkpoint, 
        5 * 60 * 1000 // 5 minutos
      );

      if (isDuplicate) {
        console.log('⚠️ [QRTrackingService] Escaneamento duplicado detectado');
        return {
          success: false,
          message: 'QR Code já foi escaneado recentemente neste ponto',
          qrCodeData
        };
      }

      // Determinar nova localização baseada no checkpoint
      const newLocation = this.getLocationFromCheckpoint(request.checkpoint);

      // Atualizar localização do equipamento
      if (newLocation) {
        await QRCodeService.updateLocation(qrCodeData.id, newLocation, request.coordinates);
      }

      // Criar evento de rastreamento
      const trackingEvent = await this.createTrackingEvent({
        qrCodeId: qrCodeData.id,
        serviceOrderId: qrCodeData.serviceOrderId,
        eventType: 'scanned',
        checkpoint: request.checkpoint,
        location: request.location,
        coordinates: request.coordinates,
        scannedBy: request.scannedBy,
        notes: request.notes,
        metadata: request.metadata
      });

      console.log('✅ [QRTrackingService] Escaneamento processado com sucesso');

      return {
        success: true,
        message: 'QR Code escaneado com sucesso',
        qrCodeData: {
          ...qrCodeData,
          currentLocation: newLocation || qrCodeData.currentLocation,
          lastScannedAt: new Date().toISOString(),
          lastScannedBy: request.scannedBy
        },
        serviceOrderId: qrCodeData.serviceOrderId,
        trackingEvent
      };

    } catch (error) {
      console.error('❌ [QRTrackingService] Erro ao processar escaneamento:', error);
      return {
        success: false,
        message: `Erro ao processar escaneamento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      };
    }
  }

  /**
   * Obtém histórico completo de rastreamento de uma OS
   */
  static async getTrackingHistory(serviceOrderId: string): Promise<TrackingHistory | null> {
    try {
      console.log('📋 [QRTrackingService] Buscando histórico para OS:', serviceOrderId);

      // Buscar QR Code da OS
      const qrCode = await QRCodeService.getActiveQRCodeByServiceOrder(serviceOrderId);
      if (!qrCode) {
        return null;
      }

      // Buscar eventos de rastreamento
      const { data, error } = await supabase
        .from('qr_tracking_events')
        .select(`
          *,
          scanned_by_user:scanned_by (
            raw_user_meta_data
          )
        `)
        .eq('service_order_id', serviceOrderId)
        .order('scanned_at', { ascending: false });

      if (error) {
        console.error('❌ [QRTrackingService] Erro ao buscar histórico:', error);
        return null;
      }

      const events = data?.map(event => this.mapEventFromDB(event)) || [];

      return {
        serviceOrderId,
        qrCode: qrCode.qrCode,
        events,
        currentLocation: qrCode.currentLocation,
        lastUpdate: qrCode.lastScannedAt || qrCode.updatedAt
      };

    } catch (error) {
      console.error('❌ [QRTrackingService] Erro ao obter histórico:', error);
      return null;
    }
  }

  /**
   * Obtém eventos recentes de rastreamento
   */
  static async getRecentTrackingEvents(limit: number = 50): Promise<QRTrackingEvent[]> {
    try {
      const { data, error } = await supabase
        .from('qr_tracking_events')
        .select(`
          *,
          equipment_qr_codes!inner(qr_code),
          service_orders!inner(client_name, equipment_type),
          scanned_by_user:scanned_by (
            raw_user_meta_data
          )
        `)
        .order('scanned_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ [QRTrackingService] Erro ao buscar eventos recentes:', error);
        return [];
      }

      return data?.map(event => this.mapEventFromDB(event)) || [];

    } catch (error) {
      console.error('❌ [QRTrackingService] Erro ao obter eventos recentes:', error);
      return [];
    }
  }

  /**
   * Cria evento de rastreamento
   */
  private static async createTrackingEvent(event: {
    qrCodeId: string;
    serviceOrderId: string;
    eventType: string;
    checkpoint?: TrackingCheckpoint;
    location?: string;
    coordinates?: [number, number];
    scannedBy?: string;
    notes?: string;
    metadata?: Record<string, any>;
  }): Promise<QRTrackingEvent> {
    const { data, error } = await supabase
      .from('qr_tracking_events')
      .insert({
        qr_code_id: event.qrCodeId,
        service_order_id: event.serviceOrderId,
        event_type: event.eventType,
        checkpoint: event.checkpoint,
        location: event.location,
        coordinates: event.coordinates ? `POINT(${event.coordinates[1]} ${event.coordinates[0]})` : null,
        scanned_by: event.scannedBy,
        notes: event.notes,
        metadata: event.metadata
      })
      .select()
      .single();

    if (error) {
      console.error('❌ [QRTrackingService] Erro ao criar evento:', error);
      throw new Error(`Erro ao criar evento de rastreamento: ${error.message}`);
    }

    return this.mapEventFromDB(data);
  }

  /**
   * Verifica se é um escaneamento duplicado
   */
  private static async checkDuplicateScan(
    qrCodeId: string, 
    checkpoint: TrackingCheckpoint, 
    timeWindowMs: number
  ): Promise<boolean> {
    try {
      const cutoffTime = new Date(Date.now() - timeWindowMs).toISOString();

      const { data, error } = await supabase
        .from('qr_tracking_events')
        .select('id')
        .eq('qr_code_id', qrCodeId)
        .eq('checkpoint', checkpoint)
        .gte('scanned_at', cutoffTime)
        .limit(1);

      return !error && data && data.length > 0;
    } catch (error) {
      console.error('❌ [QRTrackingService] Erro ao verificar duplicata:', error);
      return false;
    }
  }

  /**
   * Mapeia checkpoint para localização
   */
  private static getLocationFromCheckpoint(checkpoint: TrackingCheckpoint): EquipmentLocation | null {
    const mapping: Record<TrackingCheckpoint, EquipmentLocation | null> = {
      'collection': 'transit',
      'workshop_arrival': 'workshop',
      'workshop_departure': 'transit',
      'delivery': 'delivered',
      'manual': null
    };

    return mapping[checkpoint];
  }

  /**
   * Mapeia evento do banco para interface
   */
  private static mapEventFromDB(data: any): QRTrackingEvent {
    // Extrair coordenadas do formato PostGIS POINT
    let coordinates: [number, number] | undefined;
    if (data.coordinates) {
      const match = data.coordinates.match(/POINT\(([^)]+)\)/);
      if (match) {
        const [lng, lat] = match[1].split(' ').map(Number);
        coordinates = [lat, lng];
      }
    }

    // Extrair nome do usuário
    let scannedByName: string | undefined;
    if (data.scanned_by_user?.raw_user_meta_data?.name) {
      scannedByName = data.scanned_by_user.raw_user_meta_data.name;
    }

    return {
      id: data.id,
      qrCodeId: data.qr_code_id,
      serviceOrderId: data.service_order_id,
      eventType: data.event_type,
      checkpoint: data.checkpoint,
      location: data.location,
      coordinates,
      scannedBy: data.scanned_by,
      scannedByName,
      scannedAt: data.scanned_at,
      notes: data.notes,
      metadata: data.metadata,
      createdAt: data.created_at
    };
  }
}

export default QRTrackingService;
