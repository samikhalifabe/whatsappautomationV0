"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useContacts } from "@/hooks/useContacts"
import { useVehicles } from "@/hooks/useVehicles"
import { useConversations } from "@/hooks/useConversations"
import { useMessages } from "@/hooks/useMessages"
import { MessageSquare, Car, Users, MessageCircle } from "lucide-react"

export function DashboardStats() {
  const { contacts, tableExists: contactsTableExists } = useContacts()
  const { vehicles, loading: vehiclesLoading } = useVehicles()
  const { conversations, loading: conversationsLoading } = useConversations()
  const { messages, loading: messagesLoading } = useMessages()

  const [stats, setStats] = useState({
    conversations: 0,
    messages: 0,
    vehicles: 0,
    contacts: 0,
  })

  useEffect(() => {
    setStats({
      conversations: conversations?.length || 0,
      messages: messages?.length || 0,
      vehicles: vehicles?.length || 0,
      contacts: contactsTableExists ? contacts?.length || 0 : 0,
    })
  }, [conversations, messages, vehicles, contacts, contactsTableExists])

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Conversations</CardTitle>
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{conversationsLoading ? "..." : stats.conversations}</div>
          <p className="text-xs text-muted-foreground">Conversations actives</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Messages</CardTitle>
          <MessageCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{messagesLoading ? "..." : stats.messages}</div>
          <p className="text-xs text-muted-foreground">Messages échangés</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Véhicules</CardTitle>
          <Car className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{vehiclesLoading ? "..." : stats.vehicles}</div>
          <p className="text-xs text-muted-foreground">Véhicules enregistrés</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Contacts</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{contactsTableExists ? stats.contacts || 0 : "N/A"}</div>
          <p className="text-xs text-muted-foreground">
            {contactsTableExists ? "Contacts enregistrés" : "Table non disponible"}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
