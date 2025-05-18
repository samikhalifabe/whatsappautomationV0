"use client"

import type React from "react"
import { Check, CheckCheck, Clock } from "lucide-react"
import type { AppMessage } from "../../types/messages"

interface MessageItemProps {
  message: AppMessage
  formatDate: (timestamp: number) => string
}

const MessageItem: React.FC<MessageItemProps> = ({ message, formatDate }) => {
  const isFromMe = message.isFromMe || message.fromMe

  // Fonction pour déterminer l'icône de statut du message
  const getStatusIcon = () => {
    if (!isFromMe) return null

    switch (message.status) {
      case "sent":
        return <Check className="h-3 w-3 text-slate-400" />
      case "delivered":
        return <CheckCheck className="h-3 w-3 text-slate-400" />
      case "read":
        return <CheckCheck className="h-3 w-3 text-blue-500" />
      default:
        return <Clock className="h-3 w-3 text-slate-400" />
    }
  }

  return (
    <div className={`flex ${isFromMe ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] md:max-w-[70%] rounded-lg p-3 ${
          isFromMe
            ? "bg-[#DCF8C6] dark:bg-green-800 text-slate-800 dark:text-slate-100 rounded-tr-none"
            : "bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-600 rounded-tl-none"
        }`}
      >
        <div className="whitespace-pre-wrap break-words">{message.body}</div>
        <div className="flex justify-end items-center mt-1 space-x-1">
          <span className="text-xs text-slate-500 dark:text-slate-400">{formatDate(message.timestamp)}</span>
          {getStatusIcon()}
        </div>
      </div>
    </div>
  )
}

export default MessageItem
