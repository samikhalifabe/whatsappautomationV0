import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { MessageCircle, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { AppMessage } from "@/types/messages"
import type { ChatGroup } from "@/types/conversations"

// Import components directly with absolute paths
import MessageList from "@/components/conversations/MessageList"
import MessageInput from "@/components/conversations/MessageInput"
import ConversationHeader from "@/components/conversations/ConversationHeader"

interface ConversationDetailViewProps {
  selectedConversation: ChatGroup | null
  messagesForSelectedChat: AppMessage[]
  loadingMessages: boolean
  onSendMessage: (message: string) => Promise<void>
  sendingMessage: boolean
  sendError: string | null
  whatsAppStatus: string
  onStateChange: (newState: string) => Promise<void>
  updatingConversationState: boolean
  formatDate: (timestamp: number) => string
  formatPhoneNumber: (phoneNumber: string) => string
}

export function ConversationDetailView({
  selectedConversation,
  messagesForSelectedChat,
  loadingMessages,
  onSendMessage,
  sendingMessage,
  sendError,
  whatsAppStatus,
  onStateChange,
  updatingConversationState,
  formatDate,
  formatPhoneNumber,
}: ConversationDetailViewProps) {
  if (!selectedConversation) {
    return (
      <Card className="h-full flex items-center justify-center">
        <CardContent className="p-6 text-center text-gray-500">
          <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Sélectionnez une conversation pour afficher les messages</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full flex flex-col">
      <ConversationHeader
        selectedConversation={selectedConversation}
        onStateChange={onStateChange}
        updatingConversationState={updatingConversationState}
        formatPhoneNumber={formatPhoneNumber}
      />
      <CardContent className="flex-1 p-0 overflow-hidden flex flex-col">
        {sendError && (
          <Alert variant="destructive" className="m-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{sendError}</AlertDescription>
          </Alert>
        )}

        {whatsAppStatus !== "connected" && (
          <Alert
            variant="destructive" // Changed from "warning" to "destructive" to match allowed types
            className="m-4 bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800"
          >
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="text-amber-700 dark:text-amber-300">
              WhatsApp n'est pas connecté. Vous ne pourrez pas envoyer de messages.
            </AlertDescription>
          </Alert>
        )}

        {loadingMessages ? (
          <div className="flex-1 p-4 space-y-4">
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-12 w-1/2 ml-auto" />
            <Skeleton className="h-12 w-2/3" />
            <Skeleton className="h-12 w-3/5 ml-auto" />
          </div>
        ) : (
          <MessageList messages={messagesForSelectedChat} loadingMessages={loadingMessages} formatDate={formatDate} />
        )}

        <div className="p-4 border-t dark:border-slate-700">
          <MessageInput
            initialValue=""
            onSend={onSendMessage}
            sending={sendingMessage}
            disabled={whatsAppStatus !== "connected"}
          />
        </div>
      </CardContent>
    </Card>
  )
}
