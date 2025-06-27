/**
 * Fix Fogões - Gerenciador de Cache
 * Sistema definitivo de cache busting
 */

interface CacheInfo {
  version: string;
  buildTime: string;
  buildTimestamp: number;
}

export class CacheManager {
  private static readonly CACHE_KEY = 'fix-fogoes-cache-info';
  private static readonly VERSION_KEY = 'fix-fogoes-version';

  /**
   * Verifica se há uma nova versão disponível
   */
  static async checkForUpdates(): Promise<boolean> {
    try {
      // Buscar informações da versão atual do servidor
      const response = await fetch('/deploy-info.json?' + Date.now());

      // Se não conseguir buscar o arquivo, não é um erro crítico
      if (!response.ok) {
        console.log('ℹ️ [CacheManager] deploy-info.json não encontrado, pulando verificação');
        return false;
      }

      // Verificar se a resposta é JSON válido
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.log('ℹ️ [CacheManager] Resposta não é JSON, pulando verificação');
        return false;
      }

      const serverInfo: CacheInfo = await response.json();
      const localVersion = this.getLocalVersion();

      console.log('🔍 [CacheManager] Verificando atualizações...');
      console.log('📱 [CacheManager] Versão local:', localVersion);
      console.log('🌐 [CacheManager] Versão servidor:', serverInfo.version);

      // Se as versões são diferentes, há atualização
      if (localVersion !== serverInfo.version) {
        console.log('🆕 [CacheManager] Nova versão disponível!');
        this.setLocalVersion(serverInfo.version);
        return true;
      }

      return false;
    } catch (error) {
      console.log('ℹ️ [CacheManager] Não foi possível verificar atualizações:', error.message);
      return false;
    }
  }

  /**
   * Força atualização completa da aplicação
   */
  static async forceUpdate(): Promise<void> {
    try {
      console.log('🔄 [CacheManager] Forçando atualização...');

      // Limpar todos os caches
      await this.clearAllCaches();

      // Recarregar a página
      window.location.reload();
    } catch (error) {
      console.error('❌ [CacheManager] Erro ao forçar atualização:', error);
      // Fallback: recarregar mesmo assim
      window.location.reload();
    }
  }

  /**
   * Limpa todos os caches da aplicação
   */
  static async clearAllCaches(): Promise<void> {
    try {
      console.log('🧹 [CacheManager] Limpando caches...');

      // Limpar localStorage
      localStorage.removeItem(this.CACHE_KEY);
      localStorage.removeItem(this.VERSION_KEY);

      // Limpar sessionStorage
      sessionStorage.clear();

      // Limpar cache do service worker se existir
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      }

      // Limpar cache da API se disponível
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }

      console.log('✅ [CacheManager] Caches limpos');
    } catch (error) {
      console.error('❌ [CacheManager] Erro ao limpar caches:', error);
    }
  }

  /**
   * Obtém a versão local armazenada
   */
  private static getLocalVersion(): string {
    return localStorage.getItem(this.VERSION_KEY) || '0.0.0';
  }

  /**
   * Define a versão local
   */
  private static setLocalVersion(version: string): void {
    localStorage.setItem(this.VERSION_KEY, version);
    localStorage.setItem(this.CACHE_KEY, JSON.stringify({
      version,
      lastCheck: Date.now()
    }));
  }

  /**
   * Inicializa o gerenciador de cache
   */
  static async initialize(): Promise<void> {
    try {
      console.log('🚀 [CacheManager] Inicializando...');

      // Verificar atualizações na inicialização
      const hasUpdate = await this.checkForUpdates();
      
      if (hasUpdate) {
        console.log('🔄 [CacheManager] Atualização detectada, limpando caches...');
        await this.clearAllCaches();
      }

      // Configurar verificação periódica (a cada 5 minutos)
      setInterval(async () => {
        const hasUpdate = await this.checkForUpdates();
        if (hasUpdate) {
          console.log('🔔 [CacheManager] Nova versão disponível!');
          // Aqui você pode mostrar uma notificação para o usuário
          // ou forçar a atualização automaticamente
        }
      }, 5 * 60 * 1000); // 5 minutos

      console.log('✅ [CacheManager] Inicializado com sucesso');
    } catch (error) {
      console.error('❌ [CacheManager] Erro na inicialização:', error);
    }
  }

  /**
   * Obtém informações sobre o cache atual
   */
  static getCacheInfo(): any {
    const cacheInfo = localStorage.getItem(this.CACHE_KEY);
    return cacheInfo ? JSON.parse(cacheInfo) : null;
  }

  /**
   * Adiciona parâmetros de cache busting a URLs
   */
  static addCacheBuster(url: string): string {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}_cb=${Date.now()}`;
  }
}
