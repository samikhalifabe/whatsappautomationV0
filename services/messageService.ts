import axios from "axios"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/types/supabase"

type Vehicle = Database["public"]["Tables"]["vehicles"]["Row"]
type ContactRecord = Database["public"]["Tables"]["contact_records"]["Row"]
type Conversation = Database["public"]["Tables"]["conversations"]["Row"]
type Message = Database["public"]["Tables"]["messages"]["Row"]

interface SendMessageResult {
  success: boolean
  messageId?: string
  conversationId?: string
  error?: string
}

interface FormattedConversation {
  id: string
  phoneNumber: string
  chatId: string
  lastMessageAt: string
  vehicle: Vehicle | null
  messages: Message[]
  lastMessage: Message | null
}

// Update vehicle contact status
async function updateVehicleContactStatus(vehicleId: string) {
  try {
    const { error } = await supabase
      .from("vehicles")
      .update({ contact_status: "contacted" })
      .eq("id", vehicleId)

    if (error) throw error
  } catch (err) {
    console.error("Error updating vehicle contact status:", err)
  }
}

/**
 * Sends a WhatsApp message and updates all related records
 */
export async function sendWhatsAppMessage(
  phone: string,
  message: string,
  vehicle: Vehicle | null | undefined,
  userId: string
): Promise<SendMessageResult> {
  try {
    // Send the WhatsApp message via the API
    const { data } = await axios.post("http://localhost:3001/api/whatsapp/send", {
      number: phone,
      message,
      vehicleId: vehicle?.id, // Optional vehicleId
      userId
    })

    return {
      success: true,
      messageId: data.messageId,
      conversationId: data.conversationId
    }
  } catch (error: any) {
    console.error("Error in sendWhatsAppMessage:", error)
    return {
      success: false,
      error: error.response?.data?.error || error.message || "Erreur lors de l'envoi du message",
    }
  }
}

/**
 * Fetches all conversations with their messages
 */
export async function getConversations(): Promise<FormattedConversation[]> {
  try {
    const response = await axios.get("http://localhost:3001/api/conversations")
    return response.data || []
  } catch (error) {
    console.error("Error fetching conversations:", error)
    throw error
  }
}

/**
 * Fetches a specific conversation with all messages
 */
export async function getConversation(conversationId: string): Promise<FormattedConversation> {
  try {
    const response = await axios.get(`http://localhost:3001/api/conversations/${conversationId}`)
    return response.data
  } catch (error) {
    console.error("Error fetching conversation:", error)
    throw error
  }
}

// This function has been removed as it's no longer needed
