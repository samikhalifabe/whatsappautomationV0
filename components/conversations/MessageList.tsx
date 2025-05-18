"use client"

import type React from "react"
import { useEffect, useRef } from "react"
import MessageItem from "./MessageItem" // Import the new component
import { Loader2, MessageSquare } from "lucide-react"
import type { AppMessage } from "../../types/messages"

interface MessageListProps {
  messages: AppMessage[]
  loadingMessages: boolean
  formatDate: (timestamp: number) => string
}

export const MessageList: React.FC<MessageListProps> = ({ messages, loadingMessages, formatDate }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages]) // Scroll to bottom when messages change

  if (loadingMessages) {
    return (
      <div className="text-center text-muted-foreground flex-grow flex flex-col items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p>Chargement des messages...</p>
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="text-center text-muted-foreground flex-grow flex flex-col items-center justify-center p-8">
        <MessageSquare className="h-12 w-12 mb-4 opacity-30" />
        <p>Aucun message dans cette conversation.</p>
        <p className="text-sm mt-2">Envoyez un message pour démarrer la conversation.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col space-y-3 p-4 flex-grow overflow-y-auto">
      {messages.map((msg) => (
        <MessageItem
          key={msg.id} // Ensure unique key, might need to combine with message_id if id is not unique enough
          message={msg}
          formatDate={formatDate}
        />
      ))}
      <div ref={messagesEndRef} />
    </div>
  )
}

export default MessageList
