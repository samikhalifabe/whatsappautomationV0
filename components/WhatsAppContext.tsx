"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import axios from "axios"

interface WhatsAppContextType {
  status: string
  qrCode: string
  refreshStatus: () => Promise<void>
  lastChecked: Date | null
}

const WhatsAppContext = createContext<WhatsAppContextType>({
  status: "disconnected",
  qrCode: "",
  refreshStatus: async () => {},
  lastChecked: null,
})

export const useWhatsApp = () => useContext(WhatsAppContext)

export const WhatsAppProvider = ({ children }: { children: ReactNode }) => {
  const [status, setStatus] = useState("disconnected")
  const [qrCode, setQrCode] = useState("")
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  const SERVER_URL = "http://localhost:3001"

  const refreshStatus = async () => {
    try {
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

  // Vérifier le statut au chargement et périodiquement
  useEffect(() => {
    refreshStatus()
    const interval = setInterval(refreshStatus, 10000)
    return () => clearInterval(interval)
  }, [])

  return (
    <WhatsAppContext.Provider value={{ status, qrCode, refreshStatus, lastChecked }}>
      {children}
    </WhatsAppContext.Provider>
  )
}
