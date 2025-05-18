"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Phone, MessageCircle, Clock, CheckCircle, AlertCircle, ChevronDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import VehicleDetails from "./VehicleDetails"
import type { ChatGroup } from "../../types/conversations"
import { useToast } from "@/hooks/use-toast"

interface ConversationItemProps {
  chat: ChatGroup
  isSelected: boolean
  onSelect: (chatId: string, conversationUUID: string) => void
  formatDate: (timestamp: number) => string
  formatPhoneNumber: (phone: string) => string
  showDebugInfo?: boolean
  onStateChange?: (chatId: string, newState: string) => Promise<void>
}

const ConversationItem: React.FC<ConversationItemProps> = ({
  chat,
  isSelected,
  onSelect,
  formatDate,
  formatPhoneNumber,
  showDebugInfo = false,
  onStateChange,
}) => {
  const { toast } = useToast()
  const [isUpdating, setIsUpdating] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Fermer le menu quand on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        buttonRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // Fonction pour déterminer la couleur du badge d'état
  const getStateColor = (state: string | null | undefined) => {
    switch (state) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
      case "negotiation":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
      case "completed":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
      case "archived":
        return "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400"
      default:
        return "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400"
    }
  }

  // Fonction pour obtenir l'icône d'état
  const getStateIcon = (state: string | null | undefined) => {
    switch (state) {
      case "active":
        return <MessageCircle className="h-3 w-3 mr-1" />
      case "negotiation":
        return <Clock className="h-3 w-3 mr-1" />
      case "completed":
        return <CheckCircle className="h-3 w-3 mr-1" />
      case "archived":
        return <AlertCircle className="h-3 w-3 mr-1" />
      default:
        return <MessageCircle className="h-3 w-3 mr-1" />
    }
  }

  // Fonction pour obtenir le libellé d'état
  const getStateLabel = (state: string | null | undefined) => {
    switch (state) {
      case "active":
        return "Actif"
      case "negotiation":
        return "Négociation"
      case "completed":
        return "Terminé"
      case "archived":
        return "Archivé"
      default:
        return state || "Inconnu"
    }
  }

  // Fonction pour changer l'état de la conversation
  const handleStateChange = async (newState: string) => {
    if (!onStateChange || chat.state === newState) return

    try {
      setIsUpdating(true)
      setMenuOpen(false)
      await onStateChange(chat.id, newState)
      toast({
        title: "État mis à jour",
        description: `La conversation est maintenant en état "${getStateLabel(newState)}"`,
      })
    } catch (error) {
      console.error("Erreur lors de la mise à jour de l'état:", error)
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour l'état de la conversation",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  // Liste des états disponibles
  const states = [
    { value: "active", label: "Actif", icon: <MessageCircle className="h-3 w-3 mr-1" /> },
    { value: "negotiation", label: "Négociation", icon: <Clock className="h-3 w-3 mr-1" /> },
    { value: "completed", label: "Terminé", icon: <CheckCircle className="h-3 w-3 mr-1" /> },
    { value: "archived", label: "Archivé", icon: <AlertCircle className="h-3 w-3 mr-1" /> },
  ]

  return (
    <div
      className={`p-4 border-b cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors
        ${isSelected ? "bg-slate-100 dark:bg-slate-800" : ""}`}
      onClick={(e) => {
        // Empêcher la sélection de la conversation si on clique sur le sélecteur d'état
        if ((e.target as HTMLElement).closest("[data-state-selector]")) {
          e.stopPropagation()
          return
        }
        onSelect(chat.chatId, chat.id)
      }}
    >
      <div className="flex justify-between items-start">
        <div className="flex-grow">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">{chat.chatName || "Sans nom"}</h3>
            <div className="text-xs text-slate-500 dark:text-slate-400 ml-2 flex-shrink-0 flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              {chat.lastMessage ? formatDate(chat.lastMessage.timestamp) : formatDate(chat.lastMessageTime)}
            </div>
          </div>

          <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 mt-1">
            <Phone className="h-3 w-3 mr-1" />
            {formatPhoneNumber(chat.vehicle?.phone || chat.phoneNumber)}

            {chat.state && (
              <div className="relative ml-2">
                <button
                  ref={buttonRef}
                  data-state-selector
                  disabled={isUpdating || !onStateChange}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (onStateChange) {
                      setMenuOpen(!menuOpen)
                    }
                  }}
                  className={`px-2 py-0.5 rounded-full text-xs flex items-center ${getStateColor(chat.state)} 
                    ${onStateChange ? "hover:opacity-80 transition-opacity cursor-pointer" : ""}
                    ${isUpdating ? "opacity-50" : ""}`}
                >
                  {getStateIcon(chat.state)}
                  {getStateLabel(chat.state)}
                  {onStateChange && (
                    <ChevronDown
                      className={`h-3 w-3 ml-1 transition-transform ${menuOpen ? "transform rotate-180" : ""}`}
                    />
                  )}
                </button>

                {menuOpen && onStateChange && (
                  <div
                    ref={menuRef}
                    className="absolute z-50 mt-1 bg-white dark:bg-slate-800 rounded-md shadow-lg border border-slate-200 dark:border-slate-700 py-1 min-w-[120px] right-0"
                  >
                    {states.map((state) => (
                      <button
                        key={state.value}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleStateChange(state.value)
                        }}
                        className={`w-full px-3 py-1.5 text-sm flex items-center text-left hover:bg-slate-100 dark:hover:bg-slate-700 
                          ${state.value === chat.state ? "bg-slate-50 dark:bg-slate-700/50" : ""}`}
                      >
                        <span className={`inline-flex items-center justify-center ${getStateColor(state.value)}`}>
                          {state.icon}
                        </span>
                        {state.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <VehicleDetails vehicle={chat.vehicle} layout="compact" />

          {showDebugInfo && chat.debugInfo && (
            <div className="text-xs text-slate-400 mt-1 break-all bg-slate-50 dark:bg-slate-900/50 p-1 rounded">
              <div className="font-bold">Debug:</div>
              {chat.debugInfo}
            </div>
          )}
        </div>
      </div>

      {chat.lastMessage && (
        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <p className="text-sm text-slate-800 dark:text-slate-100 line-clamp-2">
            {chat.lastMessage.isFromMe ? (
              <Badge variant="outline" className="mr-1 font-normal">
                Vous
              </Badge>
            ) : null}
            {chat.lastMessage.body}
          </p>
        </div>
      )}
    </div>
  )
}

export default ConversationItem
