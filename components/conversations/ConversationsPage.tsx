"use client"

import { useState, useEffect, useCallback } from "react"
import axios from "axios"
import { Loader2, RefreshCw, Settings, Bell, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useAuth } from "@/hooks/useAuth"
import { useWhatsApp } from "@/components/WhatsAppContext"
import { useConversations } from "@/hooks/useConversations"
import { useMessages } from "@/hooks/useMessages"
import { useWebSocket } from "@/hooks/useWebSocket"
import AIConfigPanel from "@/components/ai-config/AIConfigPanel"

// Import components directly with absolute paths
import ConversationsList from "@/components/conversations/ConversationsList"
import { ConversationDetailView } from "@/components/conversations/ConversationDetailView"

export function ConversationsPage() {
  const { user } = useAuth()
  const { status: whatsAppStatus } = useWhatsApp()

  const {
    conversations,
    loadingDbConversations,
    error,
    selectedConversation,
    selectedConversationUUID,
    updatingConversationState,
    newMessageNotification,
    fetchDbConversations,
    handleSelectConversation,
    handleConversationStateChange,
    updateConversationOnNewMessage,
    setNewMessageNotification,
    setError,
  } = useConversations()

  const {
    messagesForSelectedChat,
    loadingMessages,
    sendingMessage,
    sendError,
    fetchMessagesForChat,
    handleSendMessage,
    addIncomingMessage,
  } = useMessages(selectedConversation, updateConversationOnNewMessage)

  const { socketConnected } = useWebSocket({ onNewMessage: addIncomingMessage })

  // State for UI toggles
  const [showDebugInfo, setShowDebugInfo] = useState<boolean>(false)
  const [showAIConfig, setShowAIConfig] = useState<boolean>(false)
  const [loadingRecentConversations, setLoadingRecentConversations] = useState<boolean>(false)

  // Récupérer les messages récents et synchroniser l'historique
  const fetchRecentConversations = async () => {
    try {
      setLoadingRecentConversations(true)
      setError(null)
      console.log("Récupération et synchronisation des conversations...")
      
      // D'abord synchroniser l'historique de toutes les conversations
      try {
        const syncResponse = await axios.post("http://localhost:3001/api/whatsapp/sync-all-conversations")
        if (syncResponse.data.success) {
          console.log(`Synchronisation réussie: ${syncResponse.data.totalNewMessages} nouveaux messages synchronisés`)
        }
      } catch (syncError: any) {
        console.warn("Erreur lors de la synchronisation (continuons quand même):", syncError)
        // Ne pas arrêter le processus si la synchronisation échoue
      }
      
      // Ensuite récupérer les conversations mises à jour
      await fetchDbConversations()
    } catch (err: any) {
      console.error("Erreur lors de la récupération des conversations :", err)
      setError(`Impossible de récupérer les conversations: ${err.message}`)
    } finally {
      setLoadingRecentConversations(false)
    }
  }

  // Formatage de la date
  const formatDate = useCallback((timestamp: number) => {
    const date = new Date(timestamp * 1000)
    const now = new Date()
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }, [])

  // Formatter le numéro de téléphone
  const formatPhoneNumber = useCallback((phoneNumber: string) => {
    return phoneNumber.replace("@c.us", "")
  }, [])

  // Effect to fetch messages when selected conversation changes
  useEffect(() => {
    if (selectedConversationUUID) {
      fetchMessagesForChat(selectedConversationUUID)
    }
  }, [selectedConversationUUID, fetchMessagesForChat])

  return (
    <div className="container mx-auto p-4">
      {/* Header avec statut et notifications */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Conversations WhatsApp</h1>
          <div className="flex items-center space-x-3">
            {/* Bouton d'actualisation */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={fetchRecentConversations}
                    disabled={loadingRecentConversations}
                    className="h-9 w-9"
                  >
                    {loadingRecentConversations ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Actualiser et synchroniser l'historique des conversations</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Bouton de configuration IA */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={showAIConfig ? "default" : "outline"}
                    size="icon"
                    onClick={() => setShowAIConfig(!showAIConfig)}
                    className="h-9 w-9"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{showAIConfig ? "Masquer" : "Afficher"} la configuration IA</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Statut WebSocket */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                    <div
                      className={`w-2 h-2 rounded-full mr-2 ${socketConnected ? "bg-green-500" : "bg-red-500"}`}
                    ></div>
                    <span className="text-sm">{socketConnected ? "WebSocket connecté" : "WebSocket déconnecté"}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>État de la connexion WebSocket pour les messages en temps réel</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Statut WhatsApp */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                    <div
                      className={`w-2 h-2 rounded-full mr-2 ${whatsAppStatus === "connected" ? "bg-green-500" : "bg-red-500"}`}
                    ></div>
                    <span className="text-sm">
                      WhatsApp {whatsAppStatus === "connected" ? "Connecté" : "Déconnecté"}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>État de la connexion WhatsApp</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Notification de nouveau message */}
            {newMessageNotification && (
              <Badge variant="destructive" className="animate-pulse">
                <Bell className="h-3 w-3 mr-1" />
                Nouveau message
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Affichage des erreurs */}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Panneau de configuration de l'IA */}
      {showAIConfig && (
        <Card className="mb-6 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-4">
            <AIConfigPanel />
          </CardContent>
        </Card>
      )}

      {/* Contenu principal - Conversations */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <ConversationsList
            selectedConversationUUID={selectedConversationUUID}
            onSelectConversation={handleSelectConversation}
            formatDate={formatDate}
            formatPhoneNumber={formatPhoneNumber}
            showDebugInfo={showDebugInfo}
            // conversations prop is not needed here as ConversationsList fetches it internally
            // loading prop is also fetched internally by ConversationsList
          />
        </div>

        <div className="md:col-span-2">
          <ConversationDetailView
            selectedConversation={selectedConversation}
            messagesForSelectedChat={messagesForSelectedChat}
            loadingMessages={loadingMessages}
            onSendMessage={handleSendMessage}
            sendingMessage={sendingMessage}
            sendError={sendError}
            whatsAppStatus={whatsAppStatus}
            onStateChange={handleConversationStateChange}
            updatingConversationState={updatingConversationState}
            formatDate={formatDate}
            formatPhoneNumber={formatPhoneNumber}
          />
        </div>
      </div>
    </div>
  )
}
