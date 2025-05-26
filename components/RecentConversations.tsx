import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, Car } from "lucide-react"
import Link from "next/link"

interface Conversation {
  id: string
  vehicle: {
    id: string
    brand: string
    model: string
    year: number
    image_url?: string
  }
  lastMessage?: {
    body: string
    timestamp: string
    isFromMe: boolean
  } | null
}

interface RecentConversationsProps {
  conversations: Conversation[]
}

export function RecentConversations({ conversations }: RecentConversationsProps) {
  return (
    <Card className="shadow-sm border-0">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-[#25D366]" />
              Conversations récentes
            </CardTitle>
            <CardDescription>Dernières interactions avec les contacts</CardDescription>
          </div>
          <Link href="/conversations">
            <Badge variant="outline" className="hover:bg-slate-100 cursor-pointer">
              Voir tout
            </Badge>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {conversations.length > 0 ? (
          <div className="space-y-2">
            {conversations.map((conversation) => (
              <Link href={`/conversations?id=${conversation.id}`} key={conversation.id}>
                <div className="flex items-center p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer border">
                  <div className="h-10 w-10 rounded-full overflow-hidden mr-3 flex-shrink-0 bg-slate-200 flex items-center justify-center">
                    {conversation.vehicle.image_url ? (
                      <img
                        src={conversation.vehicle.image_url || "/placeholder.svg"}
                        alt={`${conversation.vehicle.brand} ${conversation.vehicle.model}`}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          // Replace broken image with placeholder
                          ;(e.target as HTMLImageElement).src = "https://placehold.co/40x40/gray/white?text=No+Image"
                        }}
                      />
                    ) : (
                      <Car className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium truncate">
                        {conversation.vehicle.brand} {conversation.vehicle.model}
                      </h4>
                      {conversation.lastMessage && (
                        <span className="text-xs text-muted-foreground">
                          {new Date(conversation.lastMessage.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {conversation.lastMessage
                        ? `${conversation.lastMessage.isFromMe ? "Vous: " : ""}${conversation.lastMessage.body}`
                        : "Pas de messages récents"}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <MessageSquare className="h-12 w-12 mb-4 opacity-20" />
            <p>Aucune conversation récente</p>
            <p className="text-xs mt-1">Les conversations apparaîtront ici</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
