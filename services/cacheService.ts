interface CacheItem<T> {
  data: T
  timestamp: number
}

class CacheService {
  private cache: Map<string, CacheItem<any>> = new Map()
  private defaultTTL = 60000 // 1 minute par défaut

  /**
   * Récupère une valeur du cache
   * @param key La clé du cache
   * @returns La valeur ou undefined si elle n'existe pas ou a expiré
   */
  get<T>(key: string): T | undefined {
    const item = this.cache.get(key)

    if (!item) {
      return undefined
    }

    const now = Date.now()
    if (now - item.timestamp > this.defaultTTL) {
      // La valeur a expiré, on la supprime
      this.cache.delete(key)
      return undefined
    }

    return item.data as T
  }

  /**
   * Stocke une valeur dans le cache
   * @param key La clé du cache
   * @param data La valeur à stocker
   * @param ttl Durée de vie en millisecondes (optionnel)
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const timestamp = Date.now()
    this.cache.set(key, { data, timestamp })

    if (ttl) {
      // Si un TTL spécifique est fourni, on programme la suppression
      setTimeout(() => {
        const item = this.cache.get(key)
        if (item && item.timestamp === timestamp) {
          this.cache.delete(key)
        }
      }, ttl)
    }
  }

  /**
   * Supprime une valeur du cache
   * @param key La clé du cache
   */
  delete(key: string): void {
    this.cache.delete(key)
  }

  /**
   * Vide complètement le cache
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Change la durée de vie par défaut des éléments du cache
   * @param ttl Nouvelle durée de vie en millisecondes
   */
  setDefaultTTL(ttl: number): void {
    this.defaultTTL = ttl
  }
}

// Exporter une instance singleton
export const cacheService = new CacheService()
