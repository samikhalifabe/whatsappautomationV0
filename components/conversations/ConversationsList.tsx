"use client"

import type React from "react"
import ConversationItem from "./ConversationItem" // Import the new component
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, MessageCircle, Filter, Loader2 } from "lucide-react"
import type { ChatGroup } from "../../types/conversations"
import { useState, useMemo } from "react"

interface ConversationsListProps {
  conversations: ChatGroup[]
  selectedConversationUUID: string | null
  onSelectConversation: (chatId: string, conversationUUID: string) => void
  formatDate: (timestamp: number) => string
  formatPhoneNumber: (phone: string) => string
  showDebugInfo?: boolean
  loading: boolean // To show loading state for the list
}

const ConversationsList: React.FC<ConversationsListProps> = ({
  conversations,
  selectedConversationUUID,
  onSelectConversation,
  formatDate,
  formatPhoneNumber,
  showDebugInfo = false,
  loading,
}) => {
  const [searchTerm, setSearchTerm] = useState("")
  const [activeFilter, setActiveFilter] = useState<string>("all")

  // Filtrer les conversations en fonction de la recherche et du filtre actif
  const filteredConversations = useMemo(() => {
    return conversations.filter((chat) => {
      // Filtre de recherche
      const searchMatch =
        chat.chatName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        chat.phoneNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        chat.vehicle?.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        chat.vehicle?.model?.toLowerCase().includes(searchTerm.toLowerCase())

      // Filtre par état
      if (activeFilter === "all") return searchMatch
      if (activeFilter === "active") return searchMatch && chat.state === "active"
      if (activeFilter === "negotiation") return searchMatch && chat.state === "negotiation"
      if (activeFilter === "completed") return searchMatch && chat.state === "completed"
      if (activeFilter === "archived") return searchMatch && chat.state === "archived"

      return searchMatch
    })
  }, [conversations, searchTerm, activeFilter])

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center">
            <MessageCircle className="h-5 w-5 mr-2" />
            Contacts
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin mb-4 text-slate-400" />
            <p>Chargement des conversations...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center">
            <MessageCircle className="h-5 w-5 mr-2" />
            Contacts
          </div>
          <Badge variant="outline" className="ml-2">
            {filteredConversations.length}
          </Badge>
        </CardTitle>
        <div className="relative mt-2">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </CardHeader>

      <Tabs defaultValue="all" className="px-4" onValueChange={setActiveFilter}>
        <TabsList className="grid grid-cols-5 mb-2">
          <TabsTrigger value="all">Tous</TabsTrigger>
          <TabsTrigger value="active">Actifs</TabsTrigger>
          <TabsTrigger value="negotiation">Négo</TabsTrigger>
          <TabsTrigger value="completed">Terminés</TabsTrigger>
          <TabsTrigger value="archived">Archivés</TabsTrigger>
        </TabsList>
      </Tabs>

      <CardContent className="p-0">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <Filter className="h-8 w-8 mb-4 text-slate-400" />
            <p>Aucune conversation trouvée</p>
            {searchTerm && <p className="text-sm mt-1">Essayez d'autres termes de recherche</p>}
          </div>
        ) : (
          <div className="max-h-[600px] overflow-y-auto">
            {filteredConversations.map((chat) => (
              <ConversationItem
                key={chat.id}
                chat={chat}
                isSelected={selectedConversationUUID === chat.id}
                onSelect={onSelectConversation}
                formatDate={formatDate}
                formatPhoneNumber={formatPhoneNumber}
                showDebugInfo={showDebugInfo}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ConversationsList
