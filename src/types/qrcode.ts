/**
 * Tipos TypeScript para o sistema de QR Code
 */

// Status possíveis do QR Code
export type QRCodeStatus = 'active' | 'damaged' | 'replaced' | 'inactive';

// Localizações possíveis do equipamento
export type EquipmentLocation = 'client' | 'transit' | 'workshop' | 'delivered';

// Tipos de eventos de rastreamento
export type TrackingEventType = 'generated' | 'printed' | 'scanned' | 'location_update' | 'status_change';

// Pontos de controle do rastreamento
export type TrackingCheckpoint = 'collection' | 'workshop_arrival' | 'workshop_departure' | 'delivery' | 'manual';

// Interface principal do QR Code do equipamento
export interface EquipmentQRCode {
  id: string;
  qrCode: string;
  serviceOrderId: string;
  equipmentSerial?: string;
  generatedAt: string;
  generatedBy?: string;
  status: QRCodeStatus;
  printCount: number;
  lastScannedAt?: string;
  lastScannedBy?: string;
  currentLocation: EquipmentLocation;
  createdAt: string;
  updatedAt: string;
}

// Interface para eventos de rastreamento
export interface QRTrackingEvent {
  id: string;
  qrCodeId: string;
  serviceOrderId: string;
  eventType: TrackingEventType;
  checkpoint?: TrackingCheckpoint;
  location?: string;
  coordinates?: [number, number]; // [lat, lng]
  scannedBy?: string;
  scannedByName?: string;
  scannedAt: string;
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

// Interface para dados do QR Code (conteúdo criptografado)
export interface QRCodeData {
  id: string;           // ID único do QR
  osId: string;         // ID da ordem de serviço
  timestamp: number;    // Timestamp de geração
  hash: string;         // Hash de validação
  version: string;      // Versão do formato
}

// Interface para geração de QR Code
export interface QRCodeGenerationRequest {
  serviceOrderId: string;
  equipmentSerial?: string;
  generatedBy: string;
  location?: string;
  coordinates?: [number, number];
}

// Interface para escaneamento de QR Code
export interface QRCodeScanRequest {
  qrCode: string;
  checkpoint: TrackingCheckpoint;
  location?: string;
  coordinates?: [number, number];
  scannedBy: string;
  notes?: string;
  metadata?: Record<string, any>;
}

// Interface para resposta de escaneamento
export interface QRCodeScanResponse {
  success: boolean;
  qrCodeData?: EquipmentQRCode;
  serviceOrderId?: string;
  message: string;
  trackingEvent?: QRTrackingEvent;
}

// Interface para histórico de rastreamento
export interface TrackingHistory {
  serviceOrderId: string;
  qrCode: string;
  events: QRTrackingEvent[];
  currentLocation: EquipmentLocation;
  lastUpdate: string;
}

// Interface para estatísticas de QR Code
export interface QRCodeStats {
  totalQrCodes: number;
  activeQrCodes: number;
  totalScans: number;
  scansToday: number;
  equipmentsInTransit: number;
  equipmentsAtWorkshop: number;
}

// Interface para configuração de impressão
export interface QRCodePrintConfig {
  labelWidth: number;    // mm
  labelHeight: number;   // mm
  qrSize: number;        // mm
  fontSize: number;      // pt
  includeText: boolean;
  includeOrderNumber: boolean;
  includeDate: boolean;
}

// Interface para etiqueta de impressão
export interface QRCodeLabel {
  qrCode: string;
  qrCodeData: string;    // Dados para o QR Code
  orderNumber: string;
  equipmentType: string;
  clientName: string;
  generatedDate: string;
  printConfig: QRCodePrintConfig;
}

// Interface para validação de QR Code
export interface QRCodeValidation {
  isValid: boolean;
  qrCodeData?: QRCodeData;
  error?: string;
  equipmentQRCode?: EquipmentQRCode;
}

// Constantes para o sistema
export const QR_CODE_CONSTANTS = {
  PREFIX: 'FIX_QR_',
  VERSION: 'v1.0',
  MAX_PRINT_COUNT: 10,
  SCAN_TIMEOUT: 30000, // 30 segundos
  DEFAULT_LABEL_SIZE: {
    width: 62,  // mm
    height: 29, // mm
    qrSize: 20  // mm
  }
} as const;

// Tipos para mapeamento de banco de dados
export interface EquipmentQRCodeDB {
  id: string;
  qr_code: string;
  service_order_id: string;
  equipment_serial?: string;
  generated_at: string;
  generated_by?: string;
  status: QRCodeStatus;
  print_count: number;
  last_scanned_at?: string;
  last_scanned_by?: string;
  current_location: EquipmentLocation;
  created_at: string;
  updated_at: string;
}

export interface QRTrackingEventDB {
  id: string;
  qr_code_id: string;
  service_order_id: string;
  event_type: TrackingEventType;
  checkpoint?: TrackingCheckpoint;
  location?: string;
  coordinates?: string; // PostGIS POINT
  scanned_by?: string;
  scanned_at: string;
  notes?: string;
  metadata?: any; // JSONB
  created_at: string;
}

// Funções utilitárias de tipo
export type QRCodeEventHandler = (event: QRTrackingEvent) => void;
export type QRCodeScanHandler = (scanResult: QRCodeScanResponse) => void;
export type QRCodeGenerationHandler = (qrCode: EquipmentQRCode) => void;

// Tipos para hooks
export interface UseQRCodeGenerationReturn {
  generateQRCode: (request: QRCodeGenerationRequest) => Promise<EquipmentQRCode>;
  isGenerating: boolean;
  error: string | null;
}

export interface UseQRCodeScanningReturn {
  scanQRCode: (request: QRCodeScanRequest) => Promise<QRCodeScanResponse>;
  isScanning: boolean;
  error: string | null;
  lastScanResult: QRCodeScanResponse | null;
}

export interface UseQRTrackingHistoryReturn {
  trackingHistory: TrackingHistory | null;
  isLoading: boolean;
  error: string | null;
  refreshHistory: () => Promise<void>;
}
