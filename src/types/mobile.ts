// ===================================================================
// 📱 TIPOS PARA PWA E FUNCIONALIDADES MOBILE (MVP 4)
// ===================================================================

// Tipos para PWA (Progressive Web App)
export interface PWAConfig {
  name: string;
  short_name: string;
  description: string;
  start_url: string;
  display: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser';
  orientation: 'portrait' | 'landscape' | 'any';
  theme_color: string;
  background_color: string;
  icons: PWAIcon[];
  categories: string[];
  lang: string;
  scope: string;
}

export interface PWAIcon {
  src: string;
  sizes: string;
  type: string;
  purpose?: 'any' | 'maskable' | 'monochrome';
}

// Tipos para Service Worker
export interface ServiceWorkerConfig {
  cache_name: string;
  cache_version: string;
  urls_to_cache: string[];
  cache_strategies: CacheStrategy[];
  background_sync: BackgroundSyncConfig;
  push_notifications: PushNotificationConfig;
}

export interface CacheStrategy {
  pattern: string; // regex pattern
  strategy: 'cache_first' | 'network_first' | 'cache_only' | 'network_only' | 'stale_while_revalidate';
  cache_name: string;
  max_age?: number; // em segundos
  max_entries?: number;
}

export interface BackgroundSyncConfig {
  enabled: boolean;
  tag_prefix: string;
  retry_delay: number; // em milissegundos
  max_retries: number;
}

// Tipos para notificações push
export interface PushNotificationConfig {
  enabled: boolean;
  vapid_public_key: string;
  auto_subscribe: boolean;
  default_icon: string;
  default_badge: string;
}

export interface PushNotification {
  id: string;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  data?: any;
  actions?: NotificationAction[];
  timestamp: number;
  ttl?: number; // time to live em segundos
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  user_agent: string;
  created_at: string;
  last_used: string;
  is_active: boolean;
}

// Tipos para funcionalidades offline
export interface OfflineData {
  type: 'service_order' | 'client' | 'technician' | 'stock_movement';
  id: string;
  data: any;
  action: 'create' | 'update' | 'delete';
  timestamp: number;
  sync_status: 'pending' | 'syncing' | 'synced' | 'failed';
  retry_count: number;
  error_message?: string;
}

export interface OfflineQueue {
  items: OfflineData[];
  is_syncing: boolean;
  last_sync: string;
  sync_errors: SyncError[];
}

export interface SyncError {
  item_id: string;
  error: string;
  timestamp: number;
  retry_count: number;
}

// Tipos para gestos touch
export interface TouchGesture {
  type: 'tap' | 'double_tap' | 'long_press' | 'swipe' | 'pinch' | 'pan';
  start_position: TouchPosition;
  end_position?: TouchPosition;
  duration: number;
  distance?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  velocity?: number;
}

export interface TouchPosition {
  x: number;
  y: number;
  timestamp: number;
}

export interface SwipeConfig {
  threshold: number; // distância mínima para considerar swipe
  velocity_threshold: number; // velocidade mínima
  direction_threshold: number; // ângulo máximo de desvio
}

// Tipos para interface mobile
export interface MobileViewport {
  width: number;
  height: number;
  is_portrait: boolean;
  is_mobile: boolean;
  is_tablet: boolean;
  device_pixel_ratio: number;
  safe_area: SafeArea;
}

export interface SafeArea {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface MobileNavigation {
  type: 'bottom_tabs' | 'side_drawer' | 'top_tabs';
  items: MobileNavItem[];
  active_item: string;
  badge_counts: Record<string, number>;
}

export interface MobileNavItem {
  id: string;
  label: string;
  icon: string;
  route: string;
  badge_count?: number;
  is_active?: boolean;
  requires_auth?: boolean;
  roles?: string[];
}

// Tipos para componentes mobile
export interface MobileCard {
  id: string;
  title: string;
  subtitle?: string;
  content: any;
  actions: MobileCardAction[];
  swipe_actions?: SwipeAction[];
  style: MobileCardStyle;
}

export interface MobileCardAction {
  id: string;
  label: string;
  icon?: string;
  type: 'primary' | 'secondary' | 'danger';
  handler: () => void;
}

export interface SwipeAction {
  id: string;
  label: string;
  icon: string;
  color: string;
  side: 'left' | 'right';
  handler: () => void;
}

export interface MobileCardStyle {
  background_color?: string;
  border_color?: string;
  text_color?: string;
  elevation?: number;
  border_radius?: number;
}

// Tipos para pull-to-refresh
export interface PullToRefreshConfig {
  enabled: boolean;
  threshold: number; // distância para trigger
  max_distance: number; // distância máxima
  resistance: number; // resistência do pull (0-1)
  snap_back_duration: number; // duração da animação de volta
}

export interface PullToRefreshState {
  is_pulling: boolean;
  is_refreshing: boolean;
  pull_distance: number;
  can_refresh: boolean;
}

// Tipos para haptic feedback
export interface HapticFeedback {
  type: 'light' | 'medium' | 'heavy' | 'selection' | 'impact' | 'notification';
  enabled: boolean;
}

export interface HapticConfig {
  enabled: boolean;
  patterns: Record<string, HapticFeedback>;
}

// Tipos para orientação de tela
export interface ScreenOrientation {
  current: 'portrait' | 'landscape';
  supported: ('portrait' | 'landscape')[];
  auto_rotate: boolean;
}

// Tipos para status da bateria
export interface BatteryStatus {
  level: number; // 0-1
  charging: boolean;
  charging_time?: number; // em segundos
  discharging_time?: number; // em segundos
}

// Tipos para conectividade
export interface NetworkStatus {
  online: boolean;
  connection_type: 'wifi' | 'cellular' | 'ethernet' | 'unknown';
  effective_type: 'slow-2g' | '2g' | '3g' | '4g';
  downlink: number; // Mbps
  rtt: number; // round trip time em ms
  save_data: boolean;
}

// Tipos para armazenamento local
export interface LocalStorage {
  available_space: number; // em bytes
  used_space: number; // em bytes
  quota: number; // em bytes
  persistent: boolean;
}

// Tipos para câmera e mídia
export interface CameraConfig {
  enabled: boolean;
  facing_mode: 'user' | 'environment';
  resolution: {
    width: number;
    height: number;
  };
  quality: number; // 0-1
  format: 'jpeg' | 'png' | 'webp';
}

export interface MediaCapture {
  type: 'photo' | 'video';
  file: File;
  thumbnail?: string;
  metadata: MediaMetadata;
}

export interface MediaMetadata {
  size: number;
  width?: number;
  height?: number;
  duration?: number; // para vídeos
  timestamp: number;
  location?: GeolocationPosition;
}

// Tipos para geolocalização
export interface LocationConfig {
  enabled: boolean;
  high_accuracy: boolean;
  timeout: number; // em milissegundos
  maximum_age: number; // em milissegundos
  background_tracking: boolean;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number;
  altitude_accuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: number;
}

// Tipos para configurações do app mobile
export interface MobileAppConfig {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  notifications: NotificationSettings;
  offline_mode: boolean;
  auto_sync: boolean;
  haptic_feedback: boolean;
  location_services: boolean;
  camera_permissions: boolean;
  background_refresh: boolean;
}

export interface NotificationSettings {
  enabled: boolean;
  sound: boolean;
  vibration: boolean;
  badge: boolean;
  categories: Record<string, boolean>;
  quiet_hours: {
    enabled: boolean;
    start: string; // HH:mm
    end: string; // HH:mm
  };
}
