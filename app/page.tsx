"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DashboardLayout } from "@/components/DashboardLayout"
import { DashboardStats } from "@/components/DashboardStats"
import { WhatsAppStatus } from "@/components/WhatsAppStatus"
import { QuickActions } from "@/components/QuickActions"
import { RecentConversations } from "@/components/RecentConversations"
import { useWhatsApp } from "@/components/WhatsAppContext"
import { useVehicles } from "@/hooks/useVehicles"
import { useContacts } from "@/hooks/useContacts"
import { Loader2 } from "lucide-react"

// Import dynamique pour éviter les problèmes SSR
const WhatsAppInterface = dynamic(() => import("../components/WhatsAppInterface"), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-[#25D366]" />
    </div>
  ),
})

const MultiSender = dynamic(() => import("../components/MultiSender"), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-[#25D366]" />
    </div>
  ),
})

const ConversationsList = dynamic(() => import("../components/ConversationsList"), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-[#25D366]" />
    </div>
  ),
})

const VehicleManager = dynamic(() => import("../components/VehicleManager"), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-[#25D366]" />
    </div>
  ),
})

export default function Home() {
  const { status, qrCode, refreshStatus, lastChecked } = useWhatsApp()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { vehicles } = useVehicles()
  const { contacts } = useContacts()
  const [recentConversations, setRecentConversations] = useState([])

  // Simuler des statistiques pour le dashboard
  const stats = {
    conversations: contacts.length || 0,
    messages: Math.floor(Math.random() * 1000) + 100, // Simulé
    vehicles: vehicles.length || 0,
    contacts: contacts.length || 0,
  }

  const handleRefreshStatus = async () => {
    setIsRefreshing(true)
    await refreshStatus()
    setIsRefreshing(false)
  }

  // Préparer les conversations récentes pour l'affichage
  useEffect(() => {
    if (vehicles.length > 0 && contacts.length > 0) {
      const conversationsData = contacts.slice(0, 5).map((contact) => {
        const vehicle = vehicles.find((v) => v.id === contact.vehicle_id) || {
          id: "unknown",
          brand: "Inconnu",
          model: "Inconnu",
          year: 0,
        }

        return {
          id: contact.id,
          vehicle: vehicle,
          lastMessage: {
            body: "Dernier message de la conversation...",
            timestamp: contact.latest_contact_date || new Date().toISOString(),
            isFromMe: Math.random() > 0.5,
          },
        }
      })

      setRecentConversations(conversationsData)
    } else if (vehicles.length > 0) {
      // Si pas de contacts mais des véhicules
      const vehiclesWithPhone = vehicles.filter((v) => v.phone).slice(0, 5)

      const conversationsData = vehiclesWithPhone.map((vehicle) => ({
        id: `temp-${vehicle.id}`,
        vehicle: vehicle,
        lastMessage: null,
      }))

      setRecentConversations(conversationsData)
    }
  }, [vehicles, contacts])

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Tableau de bord</h1>

        <DashboardStats stats={stats} />

        <div className="grid gap-6 md:grid-cols-2">
          <WhatsAppStatus
            status={status}
            qrCode={qrCode}
            lastChecked={lastChecked}
            onRefresh={handleRefreshStatus}
            isRefreshing={isRefreshing}
          />
          <QuickActions />
        </div>

        <RecentConversations conversations={recentConversations} />

        <Tabs defaultValue="single" id="dashboard-tabs" className="mt-8">
          <TabsList className="mb-4">
            <TabsTrigger value="single" id="single">
              Envoi simple
            </TabsTrigger>
            <TabsTrigger value="multi" id="multi">
              Envoi multiple
            </TabsTrigger>
            <TabsTrigger value="vehicles" id="vehicles">
              Véhicules
            </TabsTrigger>
            <TabsTrigger value="conversations" id="conversations">
              Conversations
            </TabsTrigger>
          </TabsList>
          <TabsContent value="single">
            <WhatsAppInterface />
          </TabsContent>
          <TabsContent value="multi">
            <MultiSender />
          </TabsContent>
          <TabsContent value="vehicles">
            <VehicleManager />
          </TabsContent>
          <TabsContent value="conversations">
            <ConversationsList />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
