import type { Message, AppMessage } from "./messages"
import type { Vehicle } from "./vehicles"

export interface ChatGroup {
  id: string
  chatId: string
  chatName: string
  messages: AppMessage[]
  lastMessageTime: number
  phoneNumber: string
  rawPhoneNumbers: string[]
  vehicle?: Vehicle | null
  debugInfo?: string
  lastMessage?: AppMessage | null
  state?: string
  createdAt: string // Add createdAt property
}

export interface FormattedConversation {
  id: string
  phoneNumber: string
  chatId: string
  lastMessageAt: string
  vehicle: Vehicle | null
  messages: Message[]
  lastMessage: Message | null
}
