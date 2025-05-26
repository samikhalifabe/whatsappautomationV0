"use client"

import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from "react"
import axios, { AxiosError } from "axios"

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

  // Augmenter l'intervalle à 60 secondes au lieu de 30
  const REFRESH_INTERVAL = 60000

  const refreshStatus = async () => {
    // Éviter les requêtes multiples si une est déjà en cours
    if (isRefreshing) return

    try {
      setIsRefreshing(true)
      console.log("Vérification du statut WhatsApp...")
      
      // Ajouter un timeout pour éviter les requêtes qui traînent
      const response = await axios.get(`${SERVER_URL}/api/whatsapp/status`, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      const data = response.data;
      console.log("Réponse complète du statut:", response)
      console.log("Statut reçu du backend:", data.status)

      setStatus(data.status)
      console.log("Statut mis à jour dans le frontend:", data.status)
      setLastChecked(new Date())

      // Si déconnecté, essayer d'obtenir le QR code
      if (data.status === "disconnected") {
        fetchQrCode()
      }
    } catch (error) {
      console.warn("Erreur lors de la vérification du statut WhatsApp (non critique):", error)
      // Ne pas changer le statut en "error" pour éviter de perturber l'UI
      // setStatus("error")
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

  // Vérifier le statut au chargement avec un léger délai initial
  useEffect(() => {
    // Nettoyer l'intervalle précédent pour éviter les doublons
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    // Ajouter un délai avant la première vérification
    const initialCheckTimer = setTimeout(() => {
      refreshStatus();
    }, 5000); // Délai de 5 secondes (ajustable si nécessaire)

    // Créer un nouvel intervalle pour les vérifications régulières
    intervalRef.current = setInterval(refreshStatus, REFRESH_INTERVAL);

    // Nettoyage à la désinstanciation
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      clearTimeout(initialCheckTimer); // Nettoyer aussi le timer initial
    };
  }, []); // Empty dependency array means this runs once on mount

  return (
    <WhatsAppContext.Provider value={{ status, qrCode, refreshStatus, lastChecked, isRefreshing }}>
      {children}
    </WhatsAppContext.Provider>
  )
}
