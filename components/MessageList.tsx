"use client"

import { useState, useEffect, useRef } from "react"
import axios from "axios"
import { useWhatsApp } from "./WhatsAppContext"
import { Loader2 } from "lucide-react"

interface Message {
  id: string
  contact_record_id: string
  contact_date: string
  contact_type: string
  notes: string
  user_id: string
  created_at: string
}

interface MessageListProps {
  vehicleId?: string
  contactId?: string
  refreshInterval?: number // en millisecondes
  autoRefresh?: boolean // Nouvelle prop pour activer/désactiver l'auto-refresh
}

export const MessageList = ({
  vehicleId,
  contactId,
  refreshInterval = 10000,
  autoRefresh = false, // Désactivé par défaut
}: MessageListProps) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { status } = useWhatsApp()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Fonction pour récupérer les messages
  const fetchMessages = async () => {
    // Éviter les requêtes multiples si une est déjà en cours
    if (isRefreshing) return

    try {
      setIsRefreshing(true)
      setError(null)

      if (!vehicleId && !contactId) {
        setLoading(false)
        return
      }

      // Déterminer l'URL en fonction des props
      let url = ""
      if (vehicleId) {
        url = `http://localhost:3001/api/whatsapp/messages/vehicle/${vehicleId}`
      } else if (contactId) {
        url = `http://localhost:3001/api/whatsapp/messages/contact/${contactId}`
      }

      console.log("Fetching messages from:", url)
      const { data } = await axios.get(url)
      console.log("Messages received:", data)
      setMessages(data.messages || [])
    } catch (err: any) {
      console.error("Erreur lors de la récupération des messages:", err)
      setError(err.message || "Erreur lors de la récupération des messages")
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  // Récupérer les messages au chargement et configurer l'intervalle si autoRefresh est activé
  useEffect(() => {
    // Charger les messages initialement
    fetchMessages()

    // Nettoyer l'intervalle précédent
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    // Configurer l'intervalle de rafraîchissement seulement si autoRefresh est activé
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchMessages, refreshInterval)
    }

    // Nettoyer l'intervalle lors du démontage du composant
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [vehicleId, contactId, refreshInterval, autoRefresh])

  // Déterminer si un message est entrant ou sortant
  const isIncomingMessage = (type: string) => {
    return type.includes("reçu")
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-800 rounded-lg">
        <p>Erreur: {error}</p>
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p>Aucun message à afficher</p>
        {status !== "connected" && (
          <p className="mt-2 text-sm">Connectez-vous à WhatsApp pour envoyer et recevoir des messages</p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3 max-h-[400px] overflow-y-auto p-2">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${isIncomingMessage(message.contact_type) ? "justify-start" : "justify-end"}`}
        >
          <div
            className={`max-w-[80%] p-3 rounded-lg ${
              isIncomingMessage(message.contact_type) ? "bg-gray-100 text-gray-800" : "bg-[#25D366] text-white"
            }`}
          >
            <p className="whitespace-pre-wrap break-words">{message.notes}</p>
            <p className="text-xs mt-1 opacity-70 text-right">
              {new Date(message.contact_date).toLocaleTimeString()} · {message.contact_type}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

export default MessageList
