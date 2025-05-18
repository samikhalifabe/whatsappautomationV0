import axios, { AxiosRequestConfig } from "axios"
import { cacheService } from "./cacheService"
import { debounce, throttle } from "@/utils/debounce"

// Configuration de base pour axios
const api = axios.create({
  baseURL: "http://localhost:3001",
  timeout: 10000,
})

// Fonction pour générer une clé de cache basée sur la requête
const getCacheKey = (url: string, params?: any) => {
  if (!params) return url
  return `${url}?${new URLSearchParams(params).toString()}`
}

/**
 * Effectue une requête GET avec mise en cache et throttling
 * @param url L'URL de la requête
 * @param config Configuration axios optionnelle
 * @param cacheTime Durée de vie du cache en ms (défaut: 30s)
 * @returns Les données de la réponse
 */
export const fetchWithCache = async <T>(
  url: string,\
  config?: AxiosRequestConfig,
  cacheTime: number = 30000
)
: Promise<T> =>
{
  const cacheKey = getCacheKey(url, config?.params)

  // Vérifier si les données sont dans le cache
  const cachedData = cacheService.get<T>(cacheKey)
  if (cachedData) {
    console.log(`[Cache] Utilisation des données en cache pour ${cacheKey}`)
    return cachedData;
  }

  // Sinon, effectuer la requête
  try {
    console.log(`[API] Requête GET vers ${url}`)
    const response = await api.get<T>(url, config)

    // Mettre en cache les données
    cacheService.set(cacheKey, response.data, cacheTime)

    return response.data;
  } catch (error) {
    console.error(`[API] Erreur lors de la requête GET vers ${url}:`, error)
    throw error
  }
}

// Version throttled de fetchWithCache (max 1 appel par seconde)
export const throttledFetch = throttle(fetchWithCache, 1000)

// Version debounced de fetchWithCache (attend 300ms d'inactivité)
export const debouncedFetch = debounce(fetchWithCache, 300)

/**
 * Effectue une requête POST
 * @param url L'URL de la requête
 * @param data Les données à envoyer
 * @param config Configuration axios optionnelle
 * @returns Les données de la réponse
 */
export const postData = async <T>(
  url: string,
  data: any,
  config?: AxiosRequestConfig
)
: Promise<T> =>
{
  try {
    console.log(`[API] Requête POST vers ${url}`)
    const response = await api.post<T>(url, data, config)
    return response.data;
  } catch (error) {
    console.error(`[API] Erreur lors de la requête POST vers ${url}:`, error)
    throw error
  }
}

// Exporter l'instance axios pour une utilisation directe si nécessaire
export default api
