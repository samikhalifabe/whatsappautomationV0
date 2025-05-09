"use client"

import { useState, useEffect } from "react"
import { useVehicles } from "@/hooks/useVehicles"
import { useContacts } from "@/hooks/useContacts"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, MessageSquare, Search, Car, Phone, Calendar } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import VehicleConversation from "./VehicleConversation"
import type { Database } from "@/types/supabase"

type Vehicle = Database["public"]["Tables"]["vehicles"]["Row"]
type ContactRecord = Database["public"]["Tables"]["contact_records"]["Row"]
type ContactHistory = Database["public"]["Tables"]["contact_history"]["Row"]

interface ConversationPreview {
  vehicle: Vehicle
  contactRecord: ContactRecord
  lastMessage: ContactHistory | null
  unreadCount: number
}

const ConversationsList = () => {
  const { vehicles, loading: loadingVehicles } = useVehicles()
  const { contacts } = useContacts()
  const [conversations, setConversations] = useState<ConversationPreview[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [conversationOpen, setConversationOpen] = useState(false)

  // Récupérer toutes les conversations
  useEffect(() => {
    const fetchConversations = async () => {
      setLoading(true)
      
      try {
        // Si pas de véhicules ou de contacts, on arrête le chargement
        if (!vehicles.length && !loadingVehicles) {
          console.log("Aucun véhicule trouvé")
          setLoading(false)
          return
        }
        
        // Si pas de contacts mais des véhicules, on peut quand même afficher les véhicules
        if (!contacts.length) {
          console.log("Aucun contact trouvé, mais des véhicules sont disponibles")
          
          // Créer des conversations pour les véhicules qui ont un numéro de téléphone
          const vehiclesWithPhone = vehicles.filter(v => v.phone)
          
          if (vehiclesWithPhone.length > 0) {
            const conversationPreviews: ConversationPreview[] = vehiclesWithPhone.map(vehicle => ({
              vehicle,
              contactRecord: {
                id: 'temp-' + vehicle.id,
                vehicle_id: vehicle.id,
                first_contact_date: new Date().toISOString(),
                latest_contact_date: new Date().toISOString(),
                status: 'Nouveau',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                user_id: '00000000-0000-0000-0000-000000000000',
                favorite_rating: null,
                price_offered: null,
                target_price: null,
                notes: null
              },
              lastMessage: null,
              unreadCount: 0
            }))
            
            setConversations(conversationPreviews)
          }
          
          setLoading(false)
          return
        }
        
        const conversationPreviews: ConversationPreview[] = []
        
        // Pour chaque contact, récupérer le dernier message
        for (const contact of contacts) {
          if (!contact.vehicle_id) continue
          
          const vehicle = vehicles.find(v => v.id === contact.vehicle_id)
          if (!vehicle) continue
          
          // Récupérer le dernier message
          const { data: messages, error } = await supabase
            .from('contact_history')
            .select('*')
            .eq('contact_record_id', contact.id)
            .order('contact_date', { ascending: false })
            .limit(1)
          
          if (error) {
            console.error('Erreur lors de la récupération des messages:', error)
            continue
          }
          
          const lastMessage = messages && messages.length > 0 ? messages[0] : null
          
          // Ajouter à la liste des conversations
          conversationPreviews.push({
            vehicle,
            contactRecord: contact,
            lastMessage,
            unreadCount: 0 // À implémenter plus tard
          })
        }
        
        // Ajouter les véhicules qui ont un numéro mais pas de contact
        const vehiclesWithPhoneNoContact = vehicles.filter(v => 
          v.phone && !contacts.some(c => c.vehicle_id === v.id)
        )
        
        for (const vehicle of vehiclesWithPhoneNoContact) {
          conversationPreviews.push({
            vehicle,
            contactRecord: {
              id: 'temp-' + vehicle.id,
              vehicle_id: vehicle.id,
              first_contact_date: new Date().toISOString(),
              latest_contact_date: new Date().toISOString(),
              status: 'Nouveau',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              user_id: '00000000-0000-0000-0000-000000000000',
              favorite_rating: null,
              price_offered: null,
              target_price: null,
              notes: null
            },
            lastMessage: null,
            unreadCount: 0
          })
        }
        
        // Trier par date du dernier message (plus récent en premier)
        conversationPreviews.sort((a, b) => {
          const dateA = a.lastMessage ? new Date(a.lastMessage.contact_date).getTime() : 0
          const dateB = b.lastMessage ? new Date(b.lastMessage.contact_date).getTime() : 0
          return dateB - dateA
        })
        
        setConversations(conversationPreviews)
      } catch (error) {
        console.error('Erreur lors de la récupération des conversations:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchConversations()
  }, [vehicles, contacts, loadingVehicles])

  // Filtrer les conversations en fonction de la recherche
  const filteredConversations = conversations.filter(conv => {
    const vehicle = conv.vehicle
    return (
      vehicle.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (vehicle.phone && vehicle.phone.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  })

  // Formater la date pour l'affichage
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    
    // Si c'est aujourd'hui, afficher l'heure
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    }
    
    // Si c'est hier, afficher "Hier"
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Hier'
    }
    
    // Sinon, afficher la date
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
  }

  // Ouvrir la conversation
  const openConversation = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle)
    setConversationOpen(true)
  }

  // Tronquer le texte s'il est trop long
  const truncateText = (text: string, maxLength: number) => {
    if (!text) return ''
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  return (
    <Card className="shadow-md border-0">
      <CardHeader className="bg-[#25D366] text-white rounded-t-lg pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-6 w-6" />
            <CardTitle>Conversations WhatsApp</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="p-4 bg-slate-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher une conversation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <div className="px-4 border-b">
            <TabsList className="h-10">
              <TabsTrigger value="all" className="data-[state=active]:bg-[#25D366]/10">
                Toutes
              </TabsTrigger>
              <TabsTrigger value="unread" className="data-[state=active]:bg-[#25D366]/10">
                Non lues
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="all" className="m-0">
            {loading ? (
              <div className="flex justify-center items-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-[#25D366]" />
              </div>
            ) : filteredConversations.length > 0 ? (
              <ScrollArea className="h-[500px]">
                <div className="divide-y">
                  {filteredConversations.map((conv) => (
                    <div
                      key={conv.vehicle.id}
                      className="p-4 hover:bg-slate-50 cursor-pointer"
                      onClick={() => openConversation(conv.vehicle)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                          {conv.vehicle.image_url ? (
                            <img
                              src={conv.vehicle.image_url}
                              alt={`${conv.vehicle.brand} ${conv.vehicle.model}`}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "https://placehold.co/48x48/gray/white?text=V";
                              }}
                            />
                          ) : (
                            <Car className="h-6 w-6 text-gray-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <h3 className="font-medium truncate">
                              {conv.vehicle.brand} {conv.vehicle.model} ({conv.vehicle.year})
                            </h3>
                            {conv.lastMessage && (
                              <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                                {formatDate(conv.lastMessage.contact_date)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center text-sm text-gray-500 mt-1">
                            <Phone className="h-3 w-3 mr-1" />
                            <span className="truncate">{conv.vehicle.phone || "Pas de numéro"}</span>
                          </div>
                          {conv.lastMessage && (
                            <p className="text-sm text-gray-600 mt-1 truncate">
                              {conv.lastMessage.contact_type.includes("reçu") ? "" : "Vous: "}
                              {truncateText(conv.lastMessage.notes || "", 50)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="mb-2">Aucune conversation trouvée</p>
                <p className="text-sm">
                  {searchTerm
                    ? "Essayez de modifier votre recherche"
                    : "Commencez à envoyer des messages pour voir vos conversations ici"}
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="unread" className="m-0">
            <div className="p-8 text-center text-gray-500">
              <p>Fonctionnalité à venir</p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Dialog pour afficher la conversation complète */}
      <Dialog open={conversationOpen} onOpenChange={setConversationOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedVehicle && (
                <div className="flex items-center justify-between">
                  <span>
                    {selectedVehicle.brand} {selectedVehicle.model} ({selectedVehicle.year})
                  </span>
                  <Badge variant="outline" className="text-xs flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {selectedVehicle.phone}
                  </Badge>
                </div>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedVehicle && (
            <VehicleConversation
              vehicle={selectedVehicle}
              onMessageSent={() => {
                // Rafraîchir les conversations après l'envoi d'un message
                // Cette fonction sera implémentée plus tard
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}

export default ConversationsList
