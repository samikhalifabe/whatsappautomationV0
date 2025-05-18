"use client"

import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from "react"
import axios from "axios"

interface WhatsAppContextType {
  status: string
  qrCode: string
  refreshStatus: () => Promise<void>
  lastChecked: Date | null
  isRefreshing: boolean
}

const WhatsAppContext = createContext<WhatsAppContextType>({
  status: "disconnected",
  qrCode: "",
  refreshStatus: async () => {},
  lastChecked: null,
  isRefreshing: false,
})

export const useWhatsApp = () => useContext(WhatsAppContext)

export const WhatsAppProvider = ({ children }: { children: ReactNode }) => {
  const [status, setStatus] = useState("disconnected")
  const [qrCode, setQrCode] = useState("")
  const [lastChecked, setLastChecked] = useState<Date | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const SERVER_URL = "http://localhost:3001"

  // Augmenter l'intervalle à 30 secondes au lieu de 10
  const REFRESH_INTERVAL = 30000

  const refreshStatus = async () => {
    // Éviter les requêtes multiples si une est déjà en cours
    if (isRefreshing) return

    try {
      setIsRefreshing(true)
      console.log("Vérification du statut WhatsApp...")
      const { data } = await axios.get(`${SERVER_URL}/api/whatsapp/status`)
      console.log("Réponse du statut:", data)

      setStatus(data.status)
      setLastChecked(new Date())

      // Si déconnecté, essayer d'obtenir le QR code
      if (data.status === "disconnected") {
        fetchQrCode()
      }
    } catch (error) {
      console.error("Erreur lors de la vérification du statut WhatsApp:", error)
      setStatus("error")
      setLastChecked(new Date())
    } finally {
      setIsRefreshing(false)
    }
  }

  const fetchQrCode = async () => {
    try {
      const { data } = await axios.get(`${SERVER_URL}/api/whatsapp/qrcode`)
      if (data.qrcode) {
        setQrCode(data.qrcode)
      }
    } catch (error) {
      console.error("Erreur lors de la récupération du QR code:", error)
    }
  }

  // Vérifier le statut au chargement
  useEffect(() => {
    refreshStatus()

    // Nettoyer l'intervalle précédent pour éviter les doublons
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    // Créer un nouvel intervalle
    intervalRef.current = setInterval(refreshStatus, REFRESH_INTERVAL)

    // Nettoyage à la désinstanciation
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [])

  return (
    <WhatsAppContext.Provider value={{ status, qrCode, refreshStatus, lastChecked, isRefreshing }}>
      {children}
    </WhatsAppContext.Provider>
  )
}
