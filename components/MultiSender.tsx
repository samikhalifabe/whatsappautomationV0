"use client"

import type React from "react"
import { useState, useEffect } from "react"
import axios from "axios"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Send,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  Car,
  Phone,
  FileText,
  Users,
  Filter,
  MessageSquare,
  Settings,
  Eye,
  Trash2,
  Copy,
  CheckCheck,
  HelpCircle,
} from "lucide-react"
import MessageTemplates from "./MessageTemplates"
import VehicleSelector from "./VehicleSelector"
import { useMultiSender } from "@/hooks/useMultiSender"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import type { Vehicle } from "@/types/vehicles"

// Définir les sections disponibles
type Section = {
  id: string
  title: string
  description: string
  icon: React.ReactNode
}

export default function MultiSender() {
  const { toast } = useToast()

  const {
    status,
    lastChecked,
    vehicles,
    message,
    setMessage,
    sendStatus,
    isProcessing,
    progress,
    result,
    isRefreshing,
    minDelay,
    setMinDelay,
    maxDelay,
    setMaxDelay,
    maxPerHour,
    setMaxPerHour,
    randomizeOrder,
    setRandomizeOrder,
    avoidDuplicates,
    setAvoidDuplicates,
    handleRefreshStatus,
    handleVehiclesSelected,
    handleTemplateSelected,
    sendMessages,
  } = useMultiSender() // Removed getSelectedVehicles

  // Définir les sections disponibles
  const sections: Section[] = [
    {
      id: "recipients",
      title: "Destinataires",
      description: "Sélectionnez les véhicules pour l'envoi",
      icon: <Car className="h-5 w-5" />,
    },
    {
      id: "message",
      title: "Message",
      description: "Composez votre message personnalisé",
      icon: <MessageSquare className="h-5 w-5" />,
    },
    {
      id: "settings",
      title: "Paramètres",
      description: "Configurez les options d'envoi",
      icon: <Settings className="h-5 w-5" />,
    },
    {
      id: "review",
      title: "Vérification",
      description: "Vérifiez et lancez l'envoi",
      icon: <CheckCheck className="h-5 w-5" />,
    },
  ]

  const [currentSection, setCurrentSection] = useState<string>("recipients")
  const [showTemplates, setShowTemplates] = useState<boolean>(false)
  const [previewMessage, setPreviewMessage] = useState("")
  const [selectedVehicleForPreview, setSelectedVehicleForPreview] = useState<Vehicle | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>(vehicles)
  const [updatingContacts, setUpdatingContacts] = useState<boolean>(false)
  const [updateSuccess, setUpdateSuccess] = useState<boolean>(false)

  // Filtrer les véhicules en fonction du terme de recherche
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredVehicles(vehicles)
    } else {
      const filtered = vehicles.filter((vehicle) => {
        const searchLower = searchTerm.toLowerCase()
        return (
          (vehicle.brand && vehicle.brand.toLowerCase().includes(searchLower)) ||
          (vehicle.model && vehicle.model.toLowerCase().includes(searchLower)) ||
          (vehicle.phone && vehicle.phone.includes(searchTerm)) ||
          (vehicle.location && vehicle.location.toLowerCase().includes(searchLower))
        )
      })
      setFilteredVehicles(filtered)
    }
  }, [searchTerm, vehicles])

  // Générer un aperçu du message avec les variables remplacées
  useEffect(() => {
    if (!selectedVehicleForPreview || !message) {
      setPreviewMessage("")
      return
    }

    let preview = message
    const vehicle = selectedVehicleForPreview

    // Remplacer toutes les variables par leurs valeurs
    preview = preview.replace(/{{marque}}/g, vehicle.brand || "N/A")
    preview = preview.replace(/{{modele}}/g, vehicle.model || "N/A")
    preview = preview.replace(/{{prix}}/g, vehicle.price ? vehicle.price.toString() : "N/A")
    preview = preview.replace(/{{annee}}/g, vehicle.year ? vehicle.year.toString() : "N/A")
    preview = preview.replace(/{{kilometrage}}/g, vehicle.mileage ? vehicle.mileage.toString() : "N/A")
    preview = preview.replace(/{{url}}/g, vehicle.listing_url || "N/A")

    setPreviewMessage(preview)
  }, [selectedVehicleForPreview, message])

  // Sélectionner automatiquement le premier véhicule pour la prévisualisation
  useEffect(() => {
    if (vehicles.length > 0 && !selectedVehicleForPreview) {
      setSelectedVehicleForPreview(vehicles[0])
    }
  }, [vehicles, selectedVehicleForPreview])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case "pending":
        return <Clock className="h-4 w-4 text-amber-500" />
      default:
        return <Clock className="h-4 w-4 text-slate-500" />
    }
  }

  // Mettre à jour les statuts de contact des véhicules
  const updateContactedVehicles = async () => {
    try {
      setUpdatingContacts(true)
      setUpdateSuccess(false)
      toast({
        title: "Mise à jour en cours",
        description: "Mise à jour des véhicules contactés...",
        duration: 3000,
      })
      console.log("Mise à jour des véhicules contactés...")
      await axios.get("http://localhost:3001/api/whatsapp/update-contacted-vehicles")
      setUpdateSuccess(true)
      toast({
        title: "Mise à jour réussie",
        description: "Les statuts de contact des véhicules ont été mis à jour avec succès.",
        variant: "default",
        duration: 5000,
      })
      setTimeout(() => setUpdateSuccess(false), 3000)
    } catch (err: any) {
      console.error("Erreur lors de la mise à jour des véhicules contactés:", err)
      toast({
        title: "Erreur",
        description: `Impossible de mettre à jour les véhicules contactés: ${err.message}`,
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setUpdatingContacts(false)
    }
  }

  const handleCopyToClipboard = () => {
    if (previewMessage) {
      navigator.clipboard.writeText(previewMessage)
      toast({
        title: "Message copié",
        description: "Le message a été copié dans le presse-papiers",
        duration: 3000,
      })
    }
  }

  const handleRemoveVehicle = (vehicleId: string) => {
    // Filter directly from the vehicles state provided by useMultiSender
    const updatedVehicles = vehicles.filter((v: Vehicle) => v.id !== vehicleId); // Explicitly type 'v'
    handleVehiclesSelected(updatedVehicles); // Update selected vehicles state in useMultiSender

    // Si le véhicule supprimé était celui utilisé pour la prévisualisation, sélectionner un autre
    if (selectedVehicleForPreview && selectedVehicleForPreview.id === vehicleId) {
      setSelectedVehicleForPreview(updatedVehicles.length > 0 ? updatedVehicles[0] : null)
    }
  }

  const handleSelectVehicleForPreview = (vehicle: Vehicle) => {
    setSelectedVehicleForPreview(vehicle)
  }

  const clearAllVehicles = () => {
    handleVehiclesSelected([])
    setSelectedVehicleForPreview(null)
  }

  // Vérifier si l'utilisateur peut envoyer les messages
  const canSendMessages = () => {
    return vehicles.length > 0 && message.trim().length > 0 && status === "connected" && !isProcessing
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Outil d'envoi multiple</h1>
          <p className="text-muted-foreground">
            Envoyez des messages personnalisés à plusieurs contacts avec des délais intelligents
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={status === "connected" ? "default" : "destructive"}
            className={`${status === "connected" ? "bg-[#25D366] hover:bg-[#25D366]/90" : ""} px-3 py-1`}
          >
            {status === "connected" ? (
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-white animate-pulse"></span>
                Connecté
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-white/80"></span>
                Déconnecté
              </div>
            )}
          </Badge>
          <Button variant="outline" size="sm" onClick={handleRefreshStatus} disabled={isRefreshing}>
            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        </div>
      </div>

      {status !== "connected" && (
        <Alert variant="destructive" className="animate-fadeIn">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>WhatsApp non connecté</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <p>Veuillez d'abord vous connecter à WhatsApp en scannant le QR code dans l'onglet "Envoi simple".</p>
            <div className="flex items-center justify-between text-xs">
              <span>Dernier statut vérifié: {lastChecked ? lastChecked.toLocaleTimeString() : "Jamais"}</span>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Navigation par icônes */}
      <div className="w-full bg-white dark:bg-slate-800 rounded-lg shadow-sm border p-4">
        <div className="flex justify-between">
          {sections.map((section) => (
            <div
              key={section.id}
              className={`flex flex-col items-center cursor-pointer transition-colors duration-200 ${
                currentSection === section.id ? "text-[#25D366]" : "text-slate-400 hover:text-slate-600"
              }`}
              onClick={() => setCurrentSection(section.id)}
              style={{ width: `${100 / sections.length}%` }}
            >
              <div
                className={`w-12 h-12 flex items-center justify-center rounded-full mb-2 transition-colors duration-200 ${
                  currentSection === section.id
                    ? "bg-[#25D366] text-white"
                    : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300"
                }`}
              >
                {section.icon}
              </div>
              <span className="text-sm font-medium text-center">{section.title}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Panneau principal */}
        <div className="lg:col-span-8">
          <Card className="shadow-sm border-0 overflow-hidden">
            <CardHeader className="bg-slate-50 dark:bg-slate-800 rounded-t-lg pb-3 pt-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{sections.find((s) => s.id === currentSection)?.title}</CardTitle>
                  <CardDescription>{sections.find((s) => s.id === currentSection)?.description}</CardDescription>
                </div>
                {currentSection === "message" && (
                  <Button variant="outline" size="sm" onClick={() => setShowTemplates(!showTemplates)} className="h-8">
                    <FileText className="mr-1 h-4 w-4" />
                    {showTemplates ? "Masquer les modèles" : "Afficher les modèles"}
                  </Button>
                )}
                {currentSection === "recipients" && vehicles.length > 0 && (
                  <Badge variant="outline" className="bg-slate-100 dark:bg-slate-700">
                    {vehicles.length} destinataire{vehicles.length > 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {/* Section: Sélection des destinataires */}
              {currentSection === "recipients" && (
                <div className="p-0">
                  <VehicleSelector onVehiclesSelected={handleVehiclesSelected} selectedVehicles={vehicles} />
                  <div className="p-4 border-t">
                    <Button
                      onClick={updateContactedVehicles}
                      disabled={updatingContacts}
                      variant="outline"
                      className="w-full"
                    >
                      {updatingContacts ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Mise à jour des véhicules contactés...
                        </>
                      ) : (
                        <>
                          <Car className="mr-2 h-4 w-4" />
                          Mettre à jour les véhicules contactés
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Section: Composition du message */}
              {currentSection === "message" && (
                <div className="p-4 space-y-4">
                  {showTemplates ? (
                    <div className="animate-fadeIn">
                      <MessageTemplates
                        onSelectTemplate={(template) => {
                          handleTemplateSelected(template.content)
                          setShowTemplates(false)
                        }}
                      />
                    </div>
                  ) : (
                    <>
                      <div>
                        <Label htmlFor="message" className="text-sm font-medium flex items-center justify-between">
                          <span>Message</span>
                          <span className="text-xs text-muted-foreground">
                            {message.length} caractère{message.length > 1 ? "s" : ""}
                          </span>
                        </Label>
                        <Textarea
                          id="message"
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="Votre message... Utilisez {{marque}}, {{modele}}, {{prix}}, etc. pour personnaliser"
                          className="min-h-[150px] border-slate-300 resize-y"
                        />
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          <Badge
                            variant="outline"
                            className="text-xs bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors"
                            onClick={() => setMessage(message + "{{marque}}")}
                          >
                            {"{{marque}}"}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-xs bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors"
                            onClick={() => setMessage(message + "{{modele}}")}
                          >
                            {"{{modele}}"}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-xs bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors"
                            onClick={() => setMessage(message + "{{prix}}")}
                          >
                            {"{{prix}}"}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-xs bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors"
                            onClick={() => setMessage(message + "{{annee}}")}
                          >
                            {"{{annee}}"}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-xs bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors"
                            onClick={() => setMessage(message + "{{kilometrage}}")}
                          >
                            {"{{kilometrage}}"}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-xs bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors"
                            onClick={() => setMessage(message + "{{url}}")}
                          >
                            {"{{url}}"}
                          </Badge>
                        </div>
                      </div>

                      {/* Prévisualisation du message */}
                      {message && selectedVehicleForPreview && (
                        <div className="border rounded-md p-3 bg-slate-50 dark:bg-slate-800/50">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-medium flex items-center gap-1.5">
                              <Eye className="h-4 w-4 text-[#25D366]" />
                              Prévisualisation
                            </h3>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={handleCopyToClipboard}
                                title="Copier le message"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                          <div className="bg-white dark:bg-slate-900 rounded-md p-3 text-sm border">
                            <div className="flex items-center gap-2 mb-2 pb-2 border-b">
                              <div className="h-8 w-8 rounded-full bg-[#25D366] flex items-center justify-center text-white font-medium">
                                {selectedVehicleForPreview.brand?.charAt(0) || "V"}
                              </div>
                              <div className="text-xs">
                                <div className="font-medium">
                                  {selectedVehicleForPreview.brand} {selectedVehicleForPreview.model}
                                </div>
                                <div className="text-muted-foreground">{selectedVehicleForPreview.phone}</div>
                              </div>
                            </div>
                            <div className="whitespace-pre-wrap">{previewMessage}</div>
                          </div>
                        </div>
                      )}

                      {/* Liste des destinataires sélectionnés */}
                      {vehicles.length > 0 && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-sm font-medium flex items-center gap-1.5">
                              <Users className="h-4 w-4 text-[#25D366]" />
                              Destinataires sélectionnés
                            </Label>
                            <div className="flex items-center gap-2">
                              <Input
                                placeholder="Rechercher..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="h-7 text-xs w-[150px]"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={clearAllVehicles}
                                className="h-7 text-xs"
                                disabled={vehicles.length === 0}
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                Tout effacer
                              </Button>
                            </div>
                          </div>
                          <ScrollArea className="h-[180px] border rounded-md">
                            <div className="p-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                              {filteredVehicles.length > 0 ? (
                                filteredVehicles.map((vehicle) => (
                                  <div
                                    key={vehicle.id}
                                    className={cn(
                                      "flex items-center text-xs p-2 rounded-md border",
                                      selectedVehicleForPreview?.id === vehicle.id
                                        ? "bg-[#25D366]/5 border-[#25D366]/30"
                                        : "bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer",
                                    )}
                                    onClick={() => handleSelectVehicleForPreview(vehicle)}
                                  >
                                    {vehicle.image_url ? (
                                      <div className="h-8 w-8 rounded-md overflow-hidden mr-2 flex-shrink-0">
                                        <img
                                          src={vehicle.image_url || "/placeholder.svg"}
                                          alt={`${vehicle.brand} ${vehicle.model}`}
                                          className="h-full w-full object-cover"
                                          onError={(e) => {
                                            ;(e.target as HTMLImageElement).src =
                                              "https://placehold.co/32x32/gray/white?text=No+Image"
                                          }}
                                        />
                                      </div>
                                    ) : (
                                      <div className="h-8 w-8 rounded-md bg-slate-200 dark:bg-slate-700 flex items-center justify-center mr-2 flex-shrink-0">
                                        <Car className="h-4 w-4 text-muted-foreground" />
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium truncate">
                                        {vehicle.brand} {vehicle.model}
                                      </div>
                                      <div className="flex items-center text-muted-foreground">
                                        <Phone className="h-3 w-3 mr-1 flex-shrink-0" />
                                        <span className="truncate">{vehicle.phone}</span>
                                      </div>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 ml-1 opacity-60 hover:opacity-100"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleRemoveVehicle(vehicle.id)
                                      }}
                                    >
                                      <Trash2 className="h-3 w-3 text-muted-foreground" />
                                    </Button>
                                  </div>
                                ))
                              ) : searchTerm ? (
                                <div className="col-span-2 flex items-center justify-center h-[160px] text-muted-foreground text-sm">
                                  Aucun résultat pour "{searchTerm}"
                                </div>
                              ) : (
                                <div className="col-span-2 flex items-center justify-center h-[160px] text-muted-foreground text-sm">
                                  Aucun destinataire sélectionné
                                </div>
                              )}
                            </div>
                          </ScrollArea>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Section: Paramètres d'envoi */}
              {currentSection === "settings" && (
                <div className="p-4 space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-[#25D366]" />
                      <h3 className="text-sm font-medium">Délais entre les messages</h3>
                    </div>
                    <div className="space-y-4 pl-6">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="min-delay" className="text-sm">
                            Délai minimum
                          </Label>
                          <span className="text-sm font-medium">{minDelay} secondes</span>
                        </div>
                        <Slider
                          id="min-delay"
                          min={1}
                          max={30}
                          step={1}
                          value={[minDelay]}
                          onValueChange={(value) => setMinDelay(value[0])}
                          className="py-1"
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="max-delay" className="text-sm">
                            Délai maximum
                          </Label>
                          <span className="text-sm font-medium">{maxDelay} secondes</span>
                        </div>
                        <Slider
                          id="max-delay"
                          min={minDelay}
                          max={60}
                          step={1}
                          value={[maxDelay]}
                          onValueChange={(value) => setMaxDelay(value[0])}
                          className="py-1"
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-[#25D366]" />
                      <h3 className="text-sm font-medium">Limites d'envoi</h3>
                    </div>
                    <div className="space-y-2 pl-6">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="max-per-hour" className="text-sm">
                          Maximum de messages par heure
                        </Label>
                        <span className="text-sm font-medium">{maxPerHour}</span>
                      </div>
                      <Slider
                        id="max-per-hour"
                        min={5}
                        max={100}
                        step={5}
                        value={[maxPerHour]}
                        onValueChange={(value) => setMaxPerHour(value[0])}
                        className="py-1"
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-[#25D366]" />
                      <h3 className="text-sm font-medium">Options anti-spam</h3>
                    </div>
                    <div className="space-y-3 pl-6">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="randomize"
                          checked={randomizeOrder}
                          onCheckedChange={setRandomizeOrder}
                          className="data-[state=checked]:bg-[#25D366]"
                        />
                        <Label htmlFor="randomize" className="text-sm">
                          Randomiser l'ordre d'envoi
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="avoid-duplicates"
                          checked={avoidDuplicates}
                          onCheckedChange={setAvoidDuplicates}
                          className="data-[state=checked]:bg-[#25D366]"
                        />
                        <Label htmlFor="avoid-duplicates" className="text-sm">
                          Éviter les messages identiques consécutifs
                        </Label>
                      </div>
                    </div>
                  </div>

                  <Alert className="bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Recommandations</AlertTitle>
                    <AlertDescription className="text-xs">
                      <ul className="list-disc pl-4 space-y-1 mt-1">
                        <li>Utilisez des délais aléatoires entre les messages (5-20 secondes)</li>
                        <li>Limitez le nombre de messages à 30 par heure maximum</li>
                        <li>Personnalisez chaque message pour éviter les contenus identiques</li>
                        <li>Évitez d'envoyer des messages à des numéros qui ne vous ont jamais contacté</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              {/* Section: Vérification et envoi */}
              {currentSection === "review" && (
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="border shadow-none">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-1.5">
                          <Users className="h-4 w-4 text-[#25D366]" />
                          Destinataires
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm">
                          <p className="font-medium">{vehicles.length} destinataire(s) sélectionné(s)</p>
                          <p className="text-muted-foreground mt-1">
                            {vehicles.length > 0
                              ? "Tous les destinataires ont un numéro de téléphone valide."
                              : "Aucun destinataire sélectionné."}
                          </p>
                        </div>
                        {vehicles.length > 0 && (
                          <ScrollArea className="h-[100px] mt-2 border rounded-md p-2">
                            <div className="space-y-1">
                              {vehicles.slice(0, 5).map((vehicle) => (
                                <div key={vehicle.id} className="flex items-center text-xs">
                                  <div className="h-5 w-5 rounded-full bg-slate-200 flex items-center justify-center mr-2">
                                    <Car className="h-3 w-3 text-slate-500" />
                                  </div>
                                  <span className="font-medium">
                                    {vehicle.brand} {vehicle.model}
                                  </span>
                                  <span className="mx-1 text-muted-foreground">•</span>
                                  <span className="text-muted-foreground">{vehicle.phone}</span>
                                </div>
                              ))}
                              {vehicles.length > 5 && (
                                <div className="text-xs text-muted-foreground text-center pt-1">
                                  + {vehicles.length - 5} autre(s)
                                </div>
                              )}
                            </div>
                          </ScrollArea>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="border shadow-none">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-1.5">
                          <MessageSquare className="h-4 w-4 text-[#25D366]" />
                          Message
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm">
                          <p className="font-medium">
                            {message.length} caractère{message.length > 1 ? "s" : ""}
                          </p>
                          <p className="text-muted-foreground mt-1">
                            {message
                              ? "Le message contient des variables qui seront personnalisées pour chaque destinataire."
                              : "Aucun message rédigé."}
                          </p>
                        </div>
                        {message && (
                          <div className="mt-2 border rounded-md p-2 text-xs bg-slate-50 dark:bg-slate-800">
                            <div>{message}</div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="border shadow-none">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-1.5">
                        <Settings className="h-4 w-4 text-[#25D366]" />
                        Paramètres d'envoi
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="font-medium">Délais</p>
                          <p className="text-muted-foreground">
                            Entre {minDelay} et {maxDelay} secondes
                          </p>
                        </div>
                        <div>
                          <p className="font-medium">Limite horaire</p>
                          <p className="text-muted-foreground">Maximum {maxPerHour} messages/heure</p>
                        </div>
                        <div>
                          <p className="font-medium">Options</p>
                          <p className="text-muted-foreground">
                            {randomizeOrder ? "Ordre aléatoire" : "Ordre séquentiel"}
                            {avoidDuplicates ? ", Éviter les doublons" : ""}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {isProcessing && (
                    <div className="space-y-2 animate-fadeIn">
                      <div className="flex items-center justify-between text-sm">
                        <span>Progression</span>
                        <span>{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  )}

                  {result && (
                    <Alert
                      variant={result.success ? "default" : "destructive"}
                      className={`mt-4 animate-fadeIn ${
                        result.success
                          ? "bg-green-50 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800"
                          : ""
                      }`}
                    >
                      {result.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                      <AlertTitle>{result.success ? "Succès" : "Erreur"}</AlertTitle>
                      <AlertDescription>{result.message}</AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </CardContent>

            <CardFooter className="px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-b-lg flex justify-between items-center">
              <div className="text-xs text-muted-foreground">
                {vehicles.length > 0 ? (
                  <span>
                    {vehicles.length} destinataire{vehicles.length > 1 ? "s" : ""} sélectionné
                    {vehicles.length > 1 ? "s" : ""}
                  </span>
                ) : (
                  <span>Aucun destinataire sélectionné</span>
                )}
              </div>
              {currentSection === "review" ? (
                <Button
                  onClick={sendMessages}
                  disabled={!canSendMessages()}
                  className="bg-[#25D366] hover:bg-[#128C7E] text-white"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Envoyer les messages
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={() => setCurrentSection("review")}
                  disabled={vehicles.length === 0 || !message.trim()}
                  className="bg-[#25D366] hover:bg-[#128C7E] text-white"
                >
                  Vérifier et envoyer
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>

        {/* Panneau latéral */}
        <div className="lg:col-span-4 space-y-6">
          {/* Statut des envois */}
          <Card className="shadow-sm border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCheck className="h-5 w-5 text-[#25D366]" />
                Statut des envois
              </CardTitle>
              <CardDescription>Suivi des messages envoyés</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {sendStatus.length > 0 ? (
                <ScrollArea className="h-[400px] px-4">
                  <div className="space-y-2 py-2">
                    {sendStatus.map((status, index) => (
                      <div
                        key={`status-${status.contactNumber}-${index}`}
                        className={cn(
                          "flex items-center justify-between text-xs p-3 rounded-md border",
                          status.status === "success"
                            ? "bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-900/30"
                            : status.status === "error"
                              ? "bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-900/30"
                              : "bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-900/30",
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {getStatusIcon(status.status)}
                          <div className="flex flex-col">
                            <span className="font-medium">{status.contactName}</span>
                            <span className="text-muted-foreground">{status.contactNumber}</span>
                          </div>
                        </div>
                        <div className="text-muted-foreground">{status.timestamp.toLocaleTimeString()}</div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex flex-col items-center justify-center h-[400px] px-4 text-center text-muted-foreground">
                  <Send className="h-12 w-12 mb-4 opacity-20" />
                  <p>Aucun message envoyé</p>
                  <p className="text-xs mt-1">Les statuts d'envoi apparaîtront ici</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Guide rapide */}
          <Card className="shadow-sm border-0 bg-[#25D366]/5 border-[#25D366]/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-[#25D366]" />
                Guide rapide
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-3 text-sm">
                <div className="flex gap-2">
                  <div className="flex-shrink-0 h-5 w-5 rounded-full bg-[#25D366] text-white flex items-center justify-center text-xs font-medium">
                    1
                  </div>
                  <p>
                    <strong>Sélectionnez des destinataires</strong> parmi vos véhicules
                  </p>
                </div>
                <div className="flex gap-2">
                  <div className="flex-shrink-0 h-5 w-5 rounded-full bg-[#25D366] text-white flex items-center justify-center text-xs font-medium">
                    2
                  </div>
                  <p>
                    <strong>Composez votre message</strong> ou utilisez un modèle
                  </p>
                </div>
                <div className="flex gap-2">
                  <div className="flex-shrink-0 h-5 w-5 rounded-full bg-[#25D366] text-white flex items-center justify-center text-xs font-medium">
                    3
                  </div>
                  <p>
                    <strong>Configurez les paramètres</strong> d'envoi selon vos besoins
                  </p>
                </div>
                <div className="flex gap-2">
                  <div className="flex-shrink-0 h-5 w-5 rounded-full bg-[#25D366] text-white flex items-center justify-center text-xs font-medium">
                    4
                  </div>
                  <p>
                    <strong>Vérifiez et lancez</strong> l'envoi des messages
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// Icône Shield pour les options anti-spam
function Shield(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
    </svg>
  )
}

// Icône HelpCircle pour le guide rapide
function HelpCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </svg>
  )
}
