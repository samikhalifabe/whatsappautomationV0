"use client"

import type React from "react"

import { useState, useEffect } from "react"
import axios from "axios"
import { QRCodeCanvas } from "qrcode.react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Loader2, Send, QrCode, Smartphone, AlertCircle, CheckCircle, RefreshCw, MessageSquare } from "lucide-react"
import { useWhatsApp } from "./WhatsAppContext"
import MessageList from "./MessageList"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/types/supabase"

type Vehicle = Database["public"]["Tables"]["vehicles"]["Row"]

const WhatsAppInterface = () => {
  const { status, qrCode, refreshStatus, lastChecked } = useWhatsApp()
  const [number, setNumber] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [loadingVehicle, setLoadingVehicle] = useState(false)

  const BASE_URL = "http://localhost:3001/api/whatsapp"

  const handleRefreshStatus = async () => {
    setIsRefreshing(true)
    await refreshStatus()
    setIsRefreshing(false)
  }

  // Fonction pour trouver un véhicule par numéro de téléphone
  const findVehicleByPhone = async (phoneNumber: string) => {
    if (!phoneNumber) return null

    setLoadingVehicle(true)
    try {
      // Formater le numéro de téléphone pour la recherche
      const formattedPhone = phoneNumber.trim()

      const { data, error } = await supabase.from("vehicles").select("*").eq("phone", formattedPhone).limit(1)

      if (error) {
        console.error("Erreur lors de la recherche du véhicule:", error)
        return null
      }

      if (data && data.length > 0) {
        return data[0]
      }

      return null
    } catch (error) {
      console.error("Exception lors de la recherche du véhicule:", error)
      return null
    } finally {
      setLoadingVehicle(false)
    }
  }

  // Rechercher le véhicule lorsque le numéro de téléphone change
  useEffect(() => {
    const searchVehicle = async () => {
      if (number.length >= 10) {
        const vehicle = await findVehicleByPhone(number)
        setSelectedVehicle(vehicle)
      } else {
        setSelectedVehicle(null)
      }
    }

    searchVehicle()
  }, [number])

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)

    try {
      console.log("Envoi de message via WhatsAppInterface...")
      const { data } = await axios.post(`${BASE_URL}/send`, {
        number,
        message,
      })

      console.log("Réponse du serveur:", data)

      setResult({
        success: true,
        message: `Message envoyé avec succès! ID: ${data.messageId}`,
      })

      // Réinitialiser le message
      setMessage("")
    } catch (error: any) {
      console.error("Erreur lors de l'envoi:", error)
      setResult({
        success: false,
        message: error.response?.data?.error || "Erreur lors de l'envoi du message",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="bg-[#25D366]/10 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-[#25D366]" />
            <CardTitle>Envoi de message WhatsApp</CardTitle>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefreshStatus} disabled={isRefreshing} className="h-8">
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        </div>
        <CardDescription>Envoyez des messages WhatsApp à vos contacts</CardDescription>
      </CardHeader>
      <CardContent className="pt-6 pb-2">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Badge
              variant={status === "connected" ? "default" : "destructive"}
              className={`${status === "connected" ? "bg-[#25D366]" : ""}`}
            >
              {status === "connected" ? "Connecté" : "Déconnecté"}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {status === "connected"
                ? "Votre WhatsApp est connecté et prêt à envoyer des messages"
                : "Veuillez scanner le QR code pour vous connecter"}
            </span>
          </div>
          {lastChecked && (
            <span className="text-xs text-muted-foreground">Mis à jour: {lastChecked.toLocaleTimeString()}</span>
          )}
        </div>

        {status === "disconnected" && qrCode && (
          <div className="flex flex-col items-center justify-center p-6 border rounded-lg bg-slate-50 dark:bg-slate-900">
            <div className="flex items-center gap-2 mb-4 text-lg font-medium">
              <QrCode className="h-5 w-5" />
              <h2>Scannez ce QR code avec WhatsApp</h2>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <QRCodeCanvas value={qrCode} size={256} />
            </div>
            <p className="mt-4 text-sm text-muted-foreground text-center">
              Ouvrez WhatsApp sur votre téléphone &gt; Menu &gt; WhatsApp Web &gt; Scanner le code QR
            </p>
          </div>
        )}

        {status === "connected" && (
          <form onSubmit={sendMessage} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="number" className="text-sm font-medium">
                Numéro de téléphone (format international sans +)
              </label>
              <Input
                id="number"
                type="text"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="33612345678"
                required
                className="border-slate-300"
              />
              <p className="text-xs text-muted-foreground">
                Exemple: 33612345678 pour un numéro français (+33 6 12 34 56 78)
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="message" className="text-sm font-medium">
                Message
              </label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Votre message..."
                required
                className="min-h-[120px] border-slate-300"
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Envoyer le message
                </>
              )}
            </Button>
          </form>
        )}

        {result && (
          <Alert
            variant={result.success ? "default" : "destructive"}
            className={`mt-4 ${result.success ? "bg-green-50 text-green-800 border-green-200" : ""}`}
          >
            {result.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <AlertTitle>{result.success ? "Succès" : "Erreur"}</AlertTitle>
            <AlertDescription>{result.message}</AlertDescription>
          </Alert>
        )}

        {status === "connected" && number && (
          <div className="mt-6">
            <Separator className="my-4" />

            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="h-5 w-5 text-[#25D366]" />
              <h3 className="text-lg font-medium">
                Conversation
                {selectedVehicle && (
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    {selectedVehicle.brand} {selectedVehicle.model} ({selectedVehicle.year})
                  </span>
                )}
              </h3>
            </div>

            {loadingVehicle ? (
              <div className="flex justify-center items-center p-4">
                <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
              </div>
            ) : selectedVehicle ? (
              <MessageList vehicleId={selectedVehicle.id} refreshInterval={5000} />
            ) : (
              <div className="p-4 text-center text-gray-500 border border-dashed rounded-lg">
                <p>Aucun véhicule trouvé pour ce numéro de téléphone</p>
                <p className="text-sm mt-1">Les messages ne seront pas associés à un véhicule spécifique</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between pt-2 pb-6 text-xs text-muted-foreground">
        <p>WhatsApp Automation</p>
        <p>v1.0.0</p>
      </CardFooter>
    </Card>
  )
}

export default WhatsAppInterface
