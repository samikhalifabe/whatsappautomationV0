"use client"

import { useState } from "react"
import type React from "react"
import { CardHeader } from "@/components/ui/card"
import {
  Phone,
  MessageSquare,
  Car,
  ArrowLeft,
  ChevronDown,
  ExternalLink,
  Clock,
  User,
  Shield,
  CheckCircle2,
  AlertCircle,
  ArchiveIcon,
  Loader2,
  X,
  ZoomIn,
  Calendar,
  MapPin,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogClose } from "@/components/ui/dialog"
import type { ChatGroup } from "../../types/conversations"

interface ConversationHeaderProps {
  selectedConversation: ChatGroup | null | undefined
  onStateChange: (newState: string) => void
  updatingConversationState: boolean
  formatPhoneNumber: (phone: string) => string
}

export const ConversationHeader: React.FC<ConversationHeaderProps> = ({
  selectedConversation,
  onStateChange,
  updatingConversationState,
  formatPhoneNumber,
}) => {
  const [showStateMenu, setShowStateMenu] = useState(false)
  const [showImageModal, setShowImageModal] = useState(false)

  if (!selectedConversation) {
    return null
  }

  const { chatName, phoneNumber, vehicle, state, id: conversationUUID, createdAt } = selectedConversation

  // Fonction pour obtenir les détails de l'état
  const getStateDetails = (state: string | null | undefined) => {
    switch (state) {
      case "active":
        return {
          label: "Actif",
          color: "text-green-600 dark:text-green-400",
          icon: <CheckCircle2 className="h-3.5 w-3.5 mr-1" />,
        }
      case "negotiation":
        return {
          label: "Négociation",
          color: "text-amber-600 dark:text-amber-400",
          icon: <AlertCircle className="h-3.5 w-3.5 mr-1" />,
        }
      case "completed":
        return {
          label: "Terminé",
          color: "text-blue-600 dark:text-blue-400",
          icon: <Shield className="h-3.5 w-3.5 mr-1" />,
        }
      case "archived":
        return {
          label: "Archivé",
          color: "text-slate-600 dark:text-slate-400",
          icon: <ArchiveIcon className="h-3.5 w-3.5 mr-1" />,
        }
      default:
        return {
          label: state || "Inconnu",
          color: "text-slate-600 dark:text-slate-400",
          icon: <MessageSquare className="h-3.5 w-3.5 mr-1" />,
        }
    }
  }

  const stateDetails = getStateDetails(state)
  const formattedPhone = formatPhoneNumber(vehicle?.phone || phoneNumber || "")
  // Format date consistently to avoid hydration mismatches
  const formattedDate = createdAt
    ? new Date(createdAt).toISOString().replace('T', ' ').substring(0, 16) // Format as YYYY-MM-DD HH:mm
    : "Date inconnue"

  // Fonction pour changer l'état avec confirmation
  const handleStateChange = (newState: string) => {
    if (state !== newState) {
      onStateChange(newState)
      setShowStateMenu(false)
    }
  }

  return (
    <>
      <CardHeader className="p-0 border-b">
        {/* Barre principale */}
        <div className="p-3 bg-card">
          {/* Première ligne: Photo, Nom et Boutons */}
          <div className="flex items-start">
            <Button variant="ghost" size="icon" className="md:hidden mt-1 mr-2">
              <ArrowLeft className="h-4 w-4" />
            </Button>

            {/* Photo du véhicule */}
            <div className="flex-shrink-0 mr-3">
              {vehicle?.image_url ? (
                <div
                  className="relative h-24 w-32 rounded-md overflow-hidden border cursor-pointer group"
                  onClick={() => setShowImageModal(true)}
                >
                  <img
                    src={vehicle.image_url || "/placeholder.svg"}
                    alt={`${vehicle.brand} ${vehicle.model}`}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <ZoomIn className="h-6 w-6 text-white drop-shadow-md" />
                  </div>
                  <div className="absolute bottom-1 right-1 bg-white/80 dark:bg-black/80 text-xs font-bold px-1.5 py-0.5 rounded shadow">
                    {vehicle.price?.toLocaleString()} €
                  </div>
                </div>
              ) : (
                <div className="h-24 w-32 rounded-md bg-primary/10 flex items-center justify-center">
                  <Car className="h-8 w-8 text-primary" />
                </div>
              )}
            </div>

            {/* Informations principales */}
            <div className="flex-grow min-w-0">
              {/* Titre - Nom de la conversation uniquement */}
              <h2 className="text-lg font-semibold truncate">{chatName || "Conversation"}</h2>

              {/* Informations de contact */}
              <div className="flex items-center text-sm text-muted-foreground mt-1">
                <Phone className="h-3 w-3 mr-1 flex-shrink-0" />
                <span className="truncate">{formattedPhone}</span>
              </div>

              {/* Date de création */}
              <div className="flex items-center text-xs text-muted-foreground mt-1">
                <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
                <span>{formattedDate}</span>
              </div>

              {/* Lien vers l'annonce - Affiché séparément et de manière bien visible */}
              {vehicle?.listing_url && (
                <div className="mt-2">
                  <a
                    href={vehicle.listing_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm text-primary hover:text-primary/80 font-medium"
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-1" />
                    Voir l'annonce complète
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Deuxième ligne: Informations du véhicule et boutons d'action */}
          <div className="flex justify-between items-center mt-3 pt-3 border-t border-border/50">
            {/* Informations du véhicule - Toutes les informations sont maintenant ici */}
            {vehicle && (
              <div className="flex items-center gap-2 flex-wrap">
                {/* Année */}
                <div className="flex items-center bg-primary/10 px-2 py-0.5 rounded text-sm font-medium">
                  <Calendar className="h-3.5 w-3.5 mr-1 text-primary" />
                  <span>{vehicle.year}</span>
                </div>

                {/* Kilométrage */}
                <div className="flex items-center bg-primary/10 px-2 py-0.5 rounded text-sm font-medium">
                  <MapPin className="h-3.5 w-3.5 mr-1 text-primary" />
                  <span>{vehicle.mileage?.toLocaleString()} km</span>
                </div>

                {/* Transmission */}
                {vehicle.transmission && (
                  <div className="flex items-center bg-primary/10 px-2 py-0.5 rounded text-sm font-medium">
                    <span className="w-3.5 h-3.5 mr-1 flex items-center justify-center text-primary">⚙️</span>
                    <span>{vehicle.transmission}</span>
                  </div>
                )}

                {/* Carburant */}
                {vehicle.fuel_type && (
                  <div className="flex items-center bg-primary/10 px-2 py-0.5 rounded text-sm font-medium">
                    <span className="w-3.5 h-3.5 mr-1 flex items-center justify-center text-primary">⛽</span>
                    <span>{vehicle.fuel_type}</span>
                  </div>
                )}

                {/* Vendeur */}
                {vehicle.seller_name && (
                  <div className="flex items-center bg-primary/10 px-2 py-0.5 rounded text-sm font-medium">
                    <User className="h-3.5 w-3.5 mr-1 text-primary" />
                    <span>{vehicle.seller_name}</span>
                  </div>
                )}
              </div>
            )}

            {/* Boutons d'action */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Bouton d'état */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`gap-1 ${stateDetails.color}`}
                  onClick={() => setShowStateMenu(!showStateMenu)}
                  disabled={updatingConversationState}
                >
                  {updatingConversationState ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      {stateDetails.icon}
                      <span>{stateDetails.label}</span>
                      <ChevronDown className="h-4 w-4 ml-1" />
                    </>
                  )}
                </Button>

                {showStateMenu && !updatingConversationState && (
                  <div className="absolute right-0 mt-1 w-48 rounded-md shadow-lg bg-popover border z-10">
                    <div className="py-1">
                      <button
                        className={`flex items-center w-full px-4 py-2 text-sm hover:bg-accent ${
                          state === "active" ? "bg-accent/50" : ""
                        }`}
                        onClick={() => handleStateChange("active")}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                        Active
                      </button>
                      <button
                        className={`flex items-center w-full px-4 py-2 text-sm hover:bg-accent ${
                          state === "negotiation" ? "bg-accent/50" : ""
                        }`}
                        onClick={() => handleStateChange("negotiation")}
                      >
                        <AlertCircle className="h-4 w-4 mr-2 text-amber-500" />
                        Négociation
                      </button>
                      <button
                        className={`flex items-center w-full px-4 py-2 text-sm hover:bg-accent ${
                          state === "completed" ? "bg-accent/50" : ""
                        }`}
                        onClick={() => handleStateChange("completed")}
                      >
                        <Shield className="h-4 w-4 mr-2 text-blue-500" />
                        Terminée
                      </button>
                      <button
                        className={`flex items-center w-full px-4 py-2 text-sm hover:bg-accent ${
                          state === "archived" ? "bg-accent/50" : ""
                        }`}
                        onClick={() => handleStateChange("archived")}
                      >
                        <ArchiveIcon className="h-4 w-4 mr-2 text-slate-500" />
                        Archivée
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      {/* Modal pour afficher l'image en grand */}
      <Dialog open={showImageModal} onOpenChange={setShowImageModal}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="absolute top-0 right-0 z-10">
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="text-white bg-black/40 hover:bg-black/60 rounded-full m-2">
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </DialogHeader>
          {vehicle?.image_url && (
            <div className="w-full h-full flex items-center justify-center bg-black/90">
              <img
                src={vehicle.image_url || "/placeholder.svg"}
                alt={`${vehicle.brand} ${vehicle.model}`}
                className="max-w-full max-h-[85vh] object-contain"
              />
              <div className="absolute bottom-4 left-0 right-0 text-center">
                <div className="inline-block bg-black/70 text-white px-4 py-2 rounded-full text-sm">
                  {vehicle.brand} {vehicle.model} • {vehicle.year} • {vehicle.price?.toLocaleString()} €
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

export default ConversationHeader
