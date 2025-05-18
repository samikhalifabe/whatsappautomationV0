"use client"

import { useState, useEffect, useRef } from "react"
import { io, type Socket } from "socket.io-client"
import type { Database } from "@/types/supabase" // Assuming global Supabase types

// Define types locally for now, to be centralized later
type Vehicle = Database["public"]["Tables"]["vehicles"]["Row"]
interface AppMessage {
  // Renamed to avoid conflict with Message from lucide-react
  id: string
  from: string
  to: string
  body: string
  timestamp: number
  isFromMe: boolean
  chatName: string
  chatId: string
  conversation_id?: string
  vehicle?: Vehicle | null
  message_id?: string
}

interface UseWebSocketOptions {
  onNewMessage: (message: AppMessage) => void
  socketUrl?: string
  enabled?: boolean // Nouvelle option pour activer/désactiver le WebSocket
}

export const useWebSocket = ({
  onNewMessage,
  socketUrl = "http://localhost:3001",
  enabled = true, // Activé par défaut
}: UseWebSocketOptions) => {
  const [socketConnected, setSocketConnected] = useState<boolean>(false)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    // Ne pas initialiser le WebSocket si enabled est false
    if (!enabled) {
      if (socketRef.current) {
        console.log("WebSocket désactivé, fermeture de la connexion...")
        socketRef.current.disconnect()
        socketRef.current = null
        setSocketConnected(false)
      }
      return
    }

    // Initialiser le WebSocket seulement s'il n'existe pas déjà
    if (!socketRef.current) {
      console.log("Initializing WebSocket connection...")
      socketRef.current = io(socketUrl)

      socketRef.current.on("connect", () => {
        console.log("WebSocket connected!")
        setSocketConnected(true)
      })

      socketRef.current.on("disconnect", () => {
        console.log("WebSocket disconnected!")
        setSocketConnected(false)
      })

      socketRef.current.on("connect_error", (error: any) => {
        console.error("WebSocket connection error:", error)
        setSocketConnected(false)
      })

      socketRef.current.on("welcome", (data: any) => {
        console.log("Welcome message received:", data)
      })

      socketRef.current.on("new_message", (message: AppMessage) => {
        console.log("New message received via WebSocket:", message)
        onNewMessage(message)
      })
    }

    // Nettoyer la connexion WebSocket lors du démontage du composant
    return () => {
      if (socketRef.current) {
        console.log("Closing WebSocket connection...")
        socketRef.current.disconnect()
        socketRef.current = null
        setSocketConnected(false)
      }
    }
  }, [onNewMessage, socketUrl, enabled])

  // Fonction pour reconnecter manuellement le WebSocket
  const reconnect = () => {
    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
    }

    if (enabled) {
      socketRef.current = io(socketUrl)

      socketRef.current.on("connect", () => {
        console.log("WebSocket reconnected!")
        setSocketConnected(true)
      })

      // Réattacher tous les écouteurs d'événements
      socketRef.current.on("disconnect", () => {
        console.log("WebSocket disconnected!")
        setSocketConnected(false)
      })

      socketRef.current.on("connect_error", (error: any) => {
        console.error("WebSocket connection error:", error)
        setSocketConnected(false)
      })

      socketRef.current.on("welcome", (data: any) => {
        console.log("Welcome message received:", data)
      })

      socketRef.current.on("new_message", (message: AppMessage) => {
        console.log("New message received via WebSocket:", message)
        onNewMessage(message)
      })
    }
  }

  return { socketConnected, socket: socketRef.current, reconnect }
}
