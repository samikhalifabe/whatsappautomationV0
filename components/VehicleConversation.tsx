"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, Send, MessageSquare, Phone, AlertCircle, CheckCircle } from "lucide-react"
import { useWhatsApp } from "./WhatsAppContext"
import MessageList from "./MessageList"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/types/supabase"

// ID utilisateur temporaire jusqu'à ce que l'authentification soit implémentée
const TEMP_USER_ID = "00000000-0000-0000-0000-000000000000"

type Vehicle = Database["public"]["Tables"]["vehicles"]["Row"]

interface VehicleConversationProps {
  vehicle: Vehicle
  onMessageSent?: () => void
}

const VehicleConversation = ({ vehicle, onMessageSent }: VehicleConversationProps) => {
  const { status } = useWhatsApp()
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  // Réinitialiser le résultat après 5 secondes
  useEffect(() => {
    if (result) {
      const timer = setTimeout(() => {
        setResult(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [result])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!vehicle.phone) {
      setResult({
        success: false,
        message: "Ce véhicule n'a pas de numéro de téléphone associé"
      })
      return
    }
    
    setLoading(true)
    setResult(null)
    
    try {
      // Utiliser directement l'API du serveur pour envoyer le message
      const { data } = await axios.post("http://localhost:3001/api/whatsapp/send", {
        number: vehicle.phone,
        message,
      })
      
      if (data.success) {
        // Enregistrer le message dans Supabase
        const now = new Date().toISOString()
        
        // Trouver ou créer un enregistrement de contact
        const { data: existingContacts, error: fetchError } = await supabase
          .from('contact_records')
          .select('*')
          .eq('vehicle_id', vehicle.id)
          .order('created_at', { ascending: false })
          .limit(1)
        
        let contactId
        
        if (fetchError) {
          console.error('Erreur lors de la recherche du contact:', fetchError)
        } else if (existingContacts && existingContacts.length > 0) {
          contactId = existingContacts[0].id
          
          // Mettre à jour la date du dernier contact
          await supabase
            .from('contact_records')
            .update({
              latest_contact_date: now,
            })
            .eq('id', contactId)
        } else {
          // Créer un nouvel enregistrement de contact
          const { data: newContact, error: createError } = await supabase
            .from('contact_records')
            .insert({
              vehicle_id: vehicle.id,
              first_contact_date: now,
              latest_contact_date: now,
              status: 'Nouveau',
              user_id: TEMP_USER_ID,
            })
            .select()
          
          if (createError) {
            console.error('Erreur lors de la création du contact:', createError)
          } else if (newContact) {
            contactId = newContact[0].id
          }
        }
        
        // Ajouter le message à l'historique des contacts
        if (contactId) {
          await supabase.from('contact_history').insert({
            contact_record_id: contactId,
            contact_date: now,
            contact_type: 'WhatsApp',
            notes: message,
            user_id: TEMP_USER_ID,
          })
        }
        
        setMessage("")
        setResult({
          success: true,
          message: "Message envoyé avec succès"
        })
        
        // Notifier le composant parent si nécessaire
        if (onMessageSent) {
          onMessageSent()
        }
      } else {
        setResult({
          success: false,
          message: data.error || "Erreur lors de l'envoi du message"
        })
      }
    } catch (error: any) {
      console.error("Erreur lors de l'envoi du message:", error)
      setResult({
        success: false,
        message: error.message || "Erreur lors de l'envoi du message"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-[#25D366]" />
            <CardTitle className="text-lg">Conversation WhatsApp</CardTitle>
          </div>
          {vehicle.phone && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span>{vehicle.phone}</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {status !== "connected" ? (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>WhatsApp non connecté</AlertTitle>
            <AlertDescription>
              Vous devez vous connecter à WhatsApp pour envoyer et recevoir des messages.
            </AlertDescription>
          </Alert>
        ) : !vehicle.phone ? (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Numéro de téléphone manquant</AlertTitle>
            <AlertDescription>
              Ce véhicule n'a pas de numéro de téléphone associé.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="mb-4 border rounded-lg overflow-hidden">
          <MessageList vehicleId={vehicle.id} refreshInterval={5000} />
        </div>

        <form onSubmit={handleSendMessage} className="space-y-3">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tapez votre message..."
            disabled={status !== "connected" || !vehicle.phone || loading}
            className="min-h-[100px] resize-none"
          />
          
          <Button 
            type="submit" 
            className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white"
            disabled={status !== "connected" || !vehicle.phone || !message || loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Envoyer
              </>
            )}
          </Button>
        </form>

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
      </CardContent>
    </Card>
  )
}

export default VehicleConversation
