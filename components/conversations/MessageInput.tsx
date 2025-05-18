"use client"

import React, { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Send, Paperclip, Smile } from "lucide-react"

interface MessageInputProps {
  initialValue: string
  onSend: (text: string) => void
  disabled: boolean
  sending: boolean
}

export const MessageInput = React.memo(({ initialValue, onSend, disabled, sending }: MessageInputProps) => {
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [message, setMessage] = useState(initialValue)

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
  }

  const handleSend = () => {
    if (message.trim() && !disabled && !sending) {
      onSend(message)
      setMessage("")
      if (inputRef.current) {
        inputRef.current.focus()
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex items-end space-x-2">
      <Button size="icon" variant="ghost" className="rounded-full h-9 w-9 flex-shrink-0" disabled={disabled}>
        <Paperclip className="h-5 w-5 text-slate-500" />
        <span className="sr-only">Joindre un fichier</span>
      </Button>

      <Textarea
        ref={inputRef}
        value={message}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Saisissez votre message..."
        className="flex-grow resize-none min-h-[80px] max-h-[160px]"
        disabled={disabled}
      />

      <Button size="icon" variant="ghost" className="rounded-full h-9 w-9 flex-shrink-0" disabled={disabled}>
        <Smile className="h-5 w-5 text-slate-500" />
        <span className="sr-only">Ajouter un emoji</span>
      </Button>

      <Button
        onClick={handleSend}
        disabled={disabled || sending || !message.trim()}
        className="bg-[#25D366] hover:bg-[#128C7E] text-white rounded-full h-10 w-10 flex-shrink-0"
        size="icon"
      >
        {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        <span className="sr-only">Envoyer</span>
      </Button>
    </div>
  )
})

MessageInput.displayName = "MessageInput"

export default MessageInput
