import type React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { MessageList } from "./MessageList"
import { MessageInput } from "./MessageInput"
import { ConversationHeader } from "./ConversationHeader"
import type { AppMessage } from "@/types/messages"
import type { ChatGroup } from "@/types/conversations"

interface ConversationDetailProps {
  selectedConversation: ChatGroup | null
  messagesForSelectedChat: AppMessage[]
  loadingMessages: boolean
  onSendMessage: (message: string) => Promise<void>
  sendingMessage: boolean
  sendError: string | null
  whatsAppStatus: string
  onStateChange: (conversationId: string, newState: string) => Promise<void>
  updatingConversationState: boolean
  formatDate: (timestamp: number) => string
  formatPhoneNumber: (phoneNumber: string) => string
}

const ConversationDetail: React.FC<ConversationDetailProps> = ({
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
}) => {
  if (!selectedConversation) {
    return (
      <Card className="h-full flex items-center justify-center">
        <CardContent className="p-6 text-center text-gray-500">
          Sélectionnez une conversation pour afficher les messages
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full flex flex-col">
      <ConversationHeader
        conversation={selectedConversation}
        onStateChange={onStateChange}
        updatingState={updatingConversationState}
        formatPhoneNumber={formatPhoneNumber}
      />
      <CardContent className="flex-1 p-0 overflow-hidden flex flex-col">
        {loadingMessages ? (
          <div className="flex-1 p-4 space-y-4">
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-12 w-1/2 ml-auto" />
            <Skeleton className="h-12 w-2/3" />
            <Skeleton className="h-12 w-3/5 ml-auto" />
          </div>
        ) : (
          <MessageList
            messages={messagesForSelectedChat}
            formatDate={formatDate}
            className="flex-1 overflow-y-auto p-4"
          />
        )}
        <MessageInput
          onSendMessage={onSendMessage}
          sending={sendingMessage}
          error={sendError}
          disabled={whatsAppStatus !== "CONNECTED"}
        />
      </CardContent>
    </Card>
  )
}

export default ConversationDetail
