import type { Vehicle } from "./vehicles"

export interface Message {
  id: string
  body: string
  timestamp: number
  isFromMe: boolean
}

export interface AppMessage extends Message {
  from: string
  to: string
  chatName: string
  chatId: string
  conversation_id?: string
  vehicle?: Vehicle | null
  message_id?: string
}
