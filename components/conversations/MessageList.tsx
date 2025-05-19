"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
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
  const messageContainerRef = useRef<HTMLDivElement>(null) // Ref for the scrollable container
  const [isUserScrolling, setIsUserScrolling] = useState(false)
  const scrollTimer = useRef<NodeJS.Timeout | null>(null)

  const scrollToBottom = (behavior: "smooth" | "auto" = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior })
  }

  // Gestionnaire d'événements de défilement
  const handleScroll = () => {
    setIsUserScrolling(true)
    // Réinitialiser après un court délai
    if (scrollTimer.current) {
      clearTimeout(scrollTimer.current)
    }
    scrollTimer.current = setTimeout(() => {
      setIsUserScrolling(false)
    }, 300)
  }

  // Add scroll event listener using the ref
  useEffect(() => {
    const container = messageContainerRef.current
    if (container) {
      container.addEventListener("scroll", handleScroll)
      return () => {
        container.removeEventListener("scroll", handleScroll)
        if (scrollTimer.current) {
          clearTimeout(scrollTimer.current)
        }
      }
    }
  }, [])

  // Modify the scrolling logic to only scroll if near the bottom
  useEffect(() => {
    const container = messageContainerRef.current
    if (container && messages.length > 0) {
      // Check if the user is near the bottom (e.g., within 100px of the bottom)
      const isNearBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 100

      if (!isUserScrolling && isNearBottom) {
        scrollToBottom("auto") // Use "auto" for instant scroll when new messages arrive
      }
    }
  }, [messages, isUserScrolling])

  // Initial scroll to bottom when messages are loaded
  useEffect(() => {
    if (messages.length > 0 && !loadingMessages) {
      scrollToBottom("auto") // Initial scroll should be instant
    }
  }, [messages.length, loadingMessages])

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
    <div className="flex flex-col space-y-3 p-4 flex-grow overflow-y-auto" ref={messageContainerRef}>
      {" "}
      {/* Attach ref here */}
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
