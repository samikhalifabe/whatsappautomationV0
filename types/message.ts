export interface MessageTemplate {
  id: string
  name: string
  content: string
  category?: string
  favorite?: boolean
}

export interface SendStatus {
  contactId: string
  contactName: string
  contactNumber: string
  status: "pending" | "success" | "error"
  timestamp: Date
  messageId?: string
  error?: string
}
