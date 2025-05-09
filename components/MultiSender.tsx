"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import type { MessageTemplate } from "@/types/message"
import type { SendStatus } from "@/types/message"
import type { Database } from "@/types/supabase"
import { Send, AlertCircle, CheckCircle, Clock, Settings, RefreshCw, Car, Phone } from "lucide-react"
import axios from "axios"
import MessageTemplates from "./MessageTemplates"
import VehicleSelector from "./VehicleSelector"
import { useWhatsApp } from "./WhatsAppContext"
import { sendWhatsAppMessage } from "@/services/messageService"

// Temporary user ID until authentication is implemented
const TEMP_USER_ID = "00000000-0000-0000-0000-000000000000"

type Vehicle = Database["public"]["Tables"]["vehicles"]["Row"]

export default function MultiSender() {
  const { status, refreshStatus, lastChecked } = useWhatsApp()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [message, setMessage] = useState("")
  const [sendStatus, setSendStatus] = useState<SendStatus[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [activeTab, setActiveTab] = useState("compose")
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Paramètres anti-spam
  const [minDelay, setMinDelay] = useState(5)
  const [maxDelay, setMaxDelay] = useState(15)
  const [maxPerHour, setMaxPerHour] = useState(30)
  const [randomizeOrder, setRandomizeOrder] = useState(true)
  const [avoidDuplicates, setAvoidDuplicates] = useState(true)

  const BASE_URL = "http://localhost:3001/api/whatsapp"

  // Vérifier le statut au chargement du composant
  useEffect(() => {
    const checkStatus = async () => {
      await refreshStatus()
    }
    checkStatus()
  }, [])

  const handleRefreshStatus = async () => {
    setIsRefreshing(true)
    await refreshStatus()
    setIsRefreshing(false)
  }

  const handleVehiclesSelected = (selectedVehicles: Vehicle[]) => {
    // Filter out vehicles without phone numbers
    const vehiclesWithPhone = selectedVehicles.filter(vehicle => vehicle.phone)
    setVehicles(vehiclesWithPhone)
    setActiveTab("compose")
  }

  const handleTemplateSelected = (template: MessageTemplate) => {
    // Remplacer les variables par des valeurs par défaut pour l'aperçu
    let templateContent = template.content
    templateContent = templateContent.replace(/{{[ ]*(\w+)[ ]*}}/g, "___")
    setMessage(templateContent)
    setActiveTab("compose")
  }

  const sendMessages = async () => {
    if (vehicles.length === 0 || !message) {
      setResult({
        success: false,
        message: "Veuillez sélectionner des véhicules et saisir un message",
      })
      return
    }

    // Vérifier à nouveau le statut avant d'envoyer
    await refreshStatus()

    if (status !== "connected") {
      setResult({
        success: false,
        message: "WhatsApp n'est pas connecté. Veuillez scanner le QR code dans l'onglet 'Envoi simple'.",
      })
      return
    }

    setIsProcessing(true)
    setProgress(0)
    setSendStatus([])
    setResult(null)

    // Copie des véhicules pour pouvoir les randomiser sans affecter l'original
    let vehiclesToProcess = [...vehicles]

    // Randomiser l'ordre si l'option est activée
    if (randomizeOrder) {
      vehiclesToProcess = vehiclesToProcess.sort(() => Math.random() - 0.5)
    }

    // Limiter le nombre de messages par heure
    if (vehiclesToProcess.length > maxPerHour) {
      setResult({
        success: false,
        message: `Trop de véhicules sélectionnés. Maximum: ${maxPerHour} par heure.`,
      })
      setIsProcessing(false)
      return
    }

    let successCount = 0
    let failCount = 0
    let lastMessage = ""

    for (let i = 0; i < vehiclesToProcess.length; i++) {
      const vehicle = vehiclesToProcess[i]
      
      if (!vehicle.phone) {
        continue; // Skip vehicles without phone numbers
      }

      // Mettre à jour la progression
      setProgress(Math.round((i / vehiclesToProcess.length) * 100))

      // Personnaliser le message pour chaque véhicule
      let personalizedMessage = message
      // Remplacer les variables par les valeurs du véhicule
      personalizedMessage = personalizedMessage.replace(/{{[ ]*marque[ ]*}}/g, vehicle.brand)
      personalizedMessage = personalizedMessage.replace(/{{[ ]*modele[ ]*}}/g, vehicle.model)
      personalizedMessage = personalizedMessage.replace(/{{[ ]*prix[ ]*}}/g, vehicle.price.toString())
      personalizedMessage = personalizedMessage.replace(/{{[ ]*annee[ ]*}}/g, vehicle.year.toString())
      personalizedMessage = personalizedMessage.replace(/{{[ ]*kilometrage[ ]*}}/g, vehicle.mileage.toString())
      personalizedMessage = personalizedMessage.replace(/{{[ ]*url[ ]*}}/g, vehicle.listing_url)

      // Éviter les messages identiques consécutifs si l'option est activée
      if (avoidDuplicates && personalizedMessage === lastMessage) {
        personalizedMessage += " " // Ajouter un espace pour rendre le message différent
      }

      lastMessage = personalizedMessage

      // Ajouter à la liste des statuts
      setSendStatus((prev) => [
        ...prev,
        {
          contactId: vehicle.id,
          contactName: `${vehicle.brand} ${vehicle.model}`,
          contactNumber: vehicle.phone || "",
          status: "pending",
          timestamp: new Date(),
        },
      ])

      try {
        console.log(`Envoi du message pour ${vehicle.brand} ${vehicle.model} (${vehicle.phone})...`)

        // Option 1: Utiliser l'API directement
        const { data } = await axios.post(`${BASE_URL}/send`, {
          number: vehicle.phone,
          message: personalizedMessage,
        })

        // Option 2: Utiliser le service de messagerie (décommentez pour utiliser)
        // const result = await sendWhatsAppMessage(
        //   vehicle.phone || "",
        //   personalizedMessage,
        //   vehicle,
        //   TEMP_USER_ID
        // )
        // const data = { messageId: result.messageId || "unknown" }

        console.log("Réponse du serveur:", data)

        // Mettre à jour le statut
        setSendStatus((prev) =>
          prev.map((status) =>
            status.contactId === vehicle.id ? { ...status, status: "success", messageId: data.messageId } : status,
          ),
        )

        successCount++

        // Attendre un délai aléatoire entre minDelay et maxDelay secondes
        if (i < vehiclesToProcess.length - 1) {
          const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1) + minDelay) * 1000
          console.log(`Attente de ${delay / 1000} secondes avant le prochain envoi...`)
          await new Promise((resolve) => setTimeout(resolve, delay))
        }
      } catch (error: any) {
        console.error("Erreur lors de l'envoi:", error)

        // Mettre à jour le statut en cas d'erreur
        setSendStatus((prev) =>
          prev.map((status) =>
            status.contactId === vehicle.id
              ? {
                  ...status,
                  status: "error",
                  error: error.response?.data?.error || "Erreur d'envoi",
                }
              : status,
          ),
        )
        failCount++
      }
    }

    // Finaliser
    setProgress(100)
    setIsProcessing(false)
    setResult({
      success: successCount > 0,
      message: `Envoi terminé: ${successCount} message(s) envoyé(s), ${failCount} échec(s)`,
    })
  }

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

  return (
    <div className="space-y-6">
      {status !== "connected" && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>WhatsApp non connecté</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <p>Veuillez d'abord vous connecter à WhatsApp en scannant le QR code dans l'onglet "Envoi simple".</p>
            <div className="flex items-center justify-between text-xs">
              <span>Dernier statut vérifié: {lastChecked ? lastChecked.toLocaleTimeString() : "Jamais"}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshStatus}
                disabled={isRefreshing}
                className="h-7 text-xs"
              >
                {isRefreshing ? (
                  <>
                    <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                    Actualisation...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-1 h-3 w-3" />
                    Actualiser le statut
                  </>
                )}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="vehicles">Véhicules</TabsTrigger>
          <TabsTrigger value="templates">Modèles</TabsTrigger>
          <TabsTrigger value="compose">Composer</TabsTrigger>
          <TabsTrigger value="settings">Paramètres</TabsTrigger>
        </TabsList>

        <TabsContent value="vehicles" className="m-0">
          <VehicleSelector onVehiclesSelected={handleVehiclesSelected} />
        </TabsContent>

        <TabsContent value="templates" className="m-0">
          <MessageTemplates onSelectTemplate={handleTemplateSelected} />
        </TabsContent>

        <TabsContent value="compose" className="m-0">
          <Card className="shadow-md border-0">
            <CardHeader className="bg-slate-50 dark:bg-slate-800 rounded-t-lg pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Send className="h-5 w-5 text-[#25D366]" />
                  <CardTitle className="text-lg">Envoi multiple</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={status === "connected" ? "default" : "destructive"}
                    className={`${status === "connected" ? "bg-[#25D366]" : ""}`}
                  >
                    {status === "connected" ? "Connecté" : "Déconnecté"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRefreshStatus}
                    disabled={isRefreshing}
                    className="h-7 w-7 p-0"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                    <span className="sr-only">Actualiser</span>
                  </Button>
                  <Badge variant="outline" className="px-2 py-0 h-5">
                    {vehicles.length} véhicule(s)
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="message" className="text-sm font-medium">
                    Message
                  </Label>
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Votre message... Utilisez {{marque}}, {{modele}}, {{prix}}, etc. pour personnaliser"
                    className="min-h-[150px] border-slate-300"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Variables disponibles: {"{{"} marque {"}}"}, {"{{"} modele {"}}"}, {"{{"} prix {"}}"}, {"{{"} annee {"}}"}, {"{{"} kilometrage {"}}"}, {"{{"} url {"}}"}
                  </p>
                </div>

                {vehicles.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Destinataires ({vehicles.length})</Label>
                    <ScrollArea className="h-[100px] border rounded-md p-2 mt-1">
                      <div className="space-y-1">
                        {vehicles.map((vehicle) => (
                          <div key={vehicle.id} className="flex items-center text-xs mb-2">
                            {vehicle.image_url ? (
                              <div className="h-6 w-6 rounded overflow-hidden mr-2 flex-shrink-0">
                                <img 
                                  src={vehicle.image_url} 
                                  alt={`${vehicle.brand} ${vehicle.model}`} 
                                  className="h-full w-full object-cover"
                                  onError={(e) => {
                                    // Replace broken image with placeholder
                                    (e.target as HTMLImageElement).src = "https://placehold.co/24x24/gray/white?text=No+Image";
                                  }}
                                />
                              </div>
                            ) : (
                              <Car className="h-3 w-3 mr-1 text-muted-foreground" />
                            )}
                            <span className="font-medium">{vehicle.brand} {vehicle.model}</span>
                            <div className="flex items-center ml-2 text-muted-foreground">
                              <Phone className="h-3 w-3 mr-1" />
                              <span>{vehicle.phone}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                {isProcessing && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Progression</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                )}

                {sendStatus.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Statut des envois</Label>
                    <ScrollArea className="h-[150px] border rounded-md p-2 mt-1">
                      <div className="space-y-2">
                        {sendStatus.map((status, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between text-xs p-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800"
                          >
                            <div className="flex items-center gap-2">
                              {getStatusIcon(status.status)}
                              <span className="font-medium">{status.contactName}</span>
                              <span className="text-muted-foreground">{status.contactNumber}</span>
                            </div>
                            <div className="text-muted-foreground">{status.timestamp.toLocaleTimeString()}</div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                {result && (
                  <Alert
                    variant={result.success ? "default" : "destructive"}
                    className={`mt-4 ${result.success ? "bg-green-50 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800" : ""}`}
                  >
                    {result.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    <AlertTitle>{result.success ? "Succès" : "Erreur"}</AlertTitle>
                    <AlertDescription>{result.message}</AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
            <CardFooter className="px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-b-lg">
              <Button
                onClick={sendMessages}
                disabled={isProcessing || vehicles.length === 0 || !message || status !== "connected"}
                className="ml-auto bg-[#25D366] hover:bg-[#128C7E] text-white"
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
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="m-0">
          <Card className="shadow-md border-0">
            <CardHeader className="bg-slate-50 dark:bg-slate-800 rounded-t-lg pb-2">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-[#25D366]" />
                <CardTitle className="text-lg">Paramètres d'envoi</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Délais entre les messages</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="min-delay" className="text-sm">
                        Délai minimum (secondes)
                      </Label>
                      <span className="text-sm font-medium">{minDelay}s</span>
                    </div>
                    <Slider
                      id="min-delay"
                      min={1}
                      max={30}
                      step={1}
                      value={[minDelay]}
                      onValueChange={(value) => setMinDelay(value[0])}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="max-delay" className="text-sm">
                        Délai maximum (secondes)
                      </Label>
                      <span className="text-sm font-medium">{maxDelay}s</span>
                    </div>
                    <Slider
                      id="max-delay"
                      min={minDelay}
                      max={60}
                      step={1}
                      value={[maxDelay]}
                      onValueChange={(value) => setMaxDelay(value[0])}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Limites d'envoi</h3>
                  <div className="space-y-2">
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
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Options anti-spam</h3>
                  <div className="flex items-center space-x-2">
                    <Switch id="randomize" checked={randomizeOrder} onCheckedChange={setRandomizeOrder} />
                    <Label htmlFor="randomize" className="text-sm">
                      Randomiser l'ordre d'envoi
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="avoid-duplicates" checked={avoidDuplicates} onCheckedChange={setAvoidDuplicates} />
                    <Label htmlFor="avoid-duplicates" className="text-sm">
                      Éviter les messages identiques consécutifs
                    </Label>
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
