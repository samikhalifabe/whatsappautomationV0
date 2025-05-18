import { fetchWithCache, postData } from "./apiService"
import { cacheService } from "./cacheService"

// Types
interface WhatsAppStatus {
  status: string
  qrcode?: string
}

interface SendMessageResult {
  success: boolean
  messageId?: string
  conversationId?: string
  error?: string
}

/**
 * Récupère le statut de la connexion WhatsApp
 * @param forceRefresh Force le rafraîchissement du cache
 * @returns Le statut de la connexion
 */
export const getWhatsAppStatus = async (forceRefresh = false): Promise<WhatsAppStatus> => {
  const cacheKey = "whatsapp_status"

  // Si forceRefresh est true ou si les données ne sont pas en cache, faire une nouvelle requête
  if (forceRefresh) {
    cacheService.delete(cacheKey)
  }

  try {
    // Utiliser fetchWithCache avec un TTL court (10 secondes)
    return await fetchWithCache<WhatsAppStatus>("/api/whatsapp/status", undefined, 10000)
  } catch (error) {
    console.error("Erreur lors de la récupération du statut WhatsApp:", error)
    return { status: "error" }
  }
}

/**
 * Récupère le QR code pour la connexion WhatsApp
 * @returns Le QR code en base64
 */
export const getWhatsAppQRCode = async (): Promise<string | null> => {
  try {
    const response = await fetchWithCache<{ qrcode: string }>("/api/whatsapp/qrcode", undefined, 60000)
    return response.qrcode || null
  } catch (error) {
    console.error("Erreur lors de la récupération du QR code WhatsApp:", error)
    return null
  }
}

/**
 * Envoie un message WhatsApp
 * @param phoneNumber Numéro de téléphone du destinataire
 * @param message Contenu du message
 * @param vehicle Informations sur le véhicule (optionnel)
 * @param userId ID de l'utilisateur qui envoie le message
 * @returns Résultat de l'envoi du message
 */
export const sendMessage = async (
  phoneNumber: string,
  message: string,
  vehicle?: any,
  userId?: string,
): Promise<SendMessageResult> => {
  try {
    const response = await postData<SendMessageResult>("/api/whatsapp/send", {
      phoneNumber,
      message,
      vehicle,
      userId,
    })
    return response
  } catch (error) {
    console.error("Erreur lors de l'envoi du message WhatsApp:", error)
    return { success: false, error: "Erreur lors de l'envoi du message" }
  }
}

/**
 * Récupère les messages d'une conversation
 * @param conversationId ID de la conversation
 * @returns Les messages de la conversation
 */
export const getConversationMessages = async (conversationId: string): Promise<any> => {
  try {
    return await fetchWithCache(`/api/conversations/${conversationId}`, undefined, 15000)
  } catch (error) {
    console.error(`Erreur lors de la récupération des messages pour la conversation ${conversationId}:`, error)
    throw error
  }
}

/**
 * Récupère les messages d'un véhicule
 * @param vehicleId ID du véhicule
 * @returns Les messages liés au véhicule
 */
export const getVehicleMessages = async (vehicleId: string): Promise<any> => {
  try {
    return await fetchWithCache(`/api/whatsapp/messages/vehicle/${vehicleId}`, undefined, 15000)
  } catch (error) {
    console.error(`Erreur lors de la récupération des messages pour le véhicule ${vehicleId}:`, error)
    throw error
  }
}
