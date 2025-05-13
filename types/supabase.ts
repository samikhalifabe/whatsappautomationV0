export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Define the ENUM type for conversation states
export type ConversationState = "active" | "negotiation" | "manual" | "completed"

export interface Database {
  public: {
    Tables: {
      conversations: {
        Row: {
          id: string
          vehicle_id: string | null
          phone_number: string
          chat_id: string | null
          status: string // This might be deprecated or used alongside the new state
          last_message_at: string
          created_at: string
          updated_at: string
          user_id: string | null
          // New state management fields
          state: ConversationState | null // Use the ENUM type, allow null initially if needed
          last_state_change: string | null
          state_change_reason: string | null
          detected_price: number | null
          price_detected_at: string | null
          price_detected_message_id: string | null // UUID stored as string
        }
        Insert: {
          id?: string
          vehicle_id?: string | null
          phone_number: string
          chat_id?: string | null
          status?: string
          last_message_at?: string
          created_at?: string
          updated_at?: string
          user_id?: string | null
          // New state management fields
          state?: ConversationState | null
          last_state_change?: string | null
          state_change_reason?: string | null
          detected_price?: number | null
          price_detected_at?: string | null
          price_detected_message_id?: string | null
        }
        Update: {
          id?: string
          vehicle_id?: string | null
          phone_number?: string
          chat_id?: string | null
          status?: string
          last_message_at?: string
          created_at?: string
          updated_at?: string
          user_id?: string | null
          // New state management fields
          state?: ConversationState | null
          last_state_change?: string | null
          state_change_reason?: string | null
          detected_price?: number | null
          price_detected_at?: string | null
          price_detected_message_id?: string | null
        }
      }
      messages: {
        Row: {
          id: string // Changed to string to match UUID reference
          conversation_id: string
          body: string
          is_from_me: boolean
          message_id: string | null // WhatsApp message ID
          timestamp: string
          created_at: string
          user_id: string | null
        }
        Insert: {
          id?: string
          conversation_id: string
          body: string
          is_from_me: boolean
          message_id?: string | null
          timestamp: string
          created_at?: string
          user_id?: string | null
        }
        Update: {
          id?: string
          conversation_id?: string
          body?: string
          is_from_me?: boolean
          message_id?: string | null
          timestamp?: string
          created_at?: string
          user_id?: string | null
        }
      }
      vehicles: {
        Row: {
          id: string
          brand: string
          model: string
          price: number
          year: number
          mileage: number
          fuel_type: string
          transmission: string
          power: number | null
          location: string
          listing_url: string
          phone: string | null
          image_url: string | null
          created_at: string
          updated_at: string
          user_id: string | null
          contact_status: string | null
          seller_type: "particulier" | "professionnel" | null // Added from previous task
        }
        Insert: {
          id?: string
          brand: string
          model: string
          price: number
          year: number
          mileage: number
          fuel_type: string
          transmission: string
          power?: number | null
          location: string
          listing_url: string
          phone?: string | null
          image_url?: string | null
          created_at?: string
          updated_at?: string
          user_id?: string | null
          contact_status?: string | null
          seller_type?: "particulier" | "professionnel" | null // Added from previous task
        }
        Update: {
          id?: string
          brand?: string
          model?: string
          price?: number
          year?: number
          mileage?: number
          fuel_type?: string
          transmission?: string
          power?: number | null
          location?: string
          listing_url?: string
          phone?: string | null
          image_url?: string | null
          created_at?: string
          updated_at?: string
          user_id?: string | null
          contact_status?: string | null
          seller_type?: "particulier" | "professionnel" | null // Added from previous task
        }
      }
      contact_records: {
        Row: {
          id: string
          vehicle_id: string | null
          first_contact_date: string
          latest_contact_date: string
          status: string
          favorite_rating: number | null
          price_offered: number | null
          target_price: number | null
          notes: string | null
          created_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          vehicle_id?: string | null
          first_contact_date: string
          latest_contact_date: string
          status: string
          favorite_rating?: number | null
          price_offered?: number | null
          target_price?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          vehicle_id?: string | null
          first_contact_date?: string
          latest_contact_date?: string
          status?: string
          favorite_rating?: number | null
          price_offered?: number | null
          target_price?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          user_id?: string
        }
      }
      contact_history: {
        Row: {
          id: string
          contact_record_id: string | null
          contact_date: string
          contact_type: string
          notes: string | null
          created_at: string
          user_id: string
        }
        Insert: {
          id?: string
          contact_record_id?: string | null
          contact_date: string
          contact_type: string
          notes?: string | null
          created_at?: string
          user_id: string
        }
        Update: {
          id?: string
          contact_record_id?: string | null
          contact_date?: string
          contact_type?: string
          notes?: string | null
          created_at?: string
          user_id?: string
        }
      }
      // Assuming you might have this table based on previous code snippets
      price_offers: {
        Row: {
          id: string
          conversation_id: string
          vehicle_id: string | null
          user_id: string | null
          message_id: string | null // Link to the message table
          offered_price: number
          offer_currency: string | null
          status: string | null // e.g., 'pending', 'accepted', 'rejected'
          notes: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          conversation_id: string
          vehicle_id?: string | null
          user_id?: string | null
          message_id?: string | null
          offered_price: number
          offer_currency?: string | null
          status?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          conversation_id?: string
          vehicle_id?: string | null
          user_id?: string | null
          message_id?: string | null
          offered_price?: number
          offer_currency?: string | null
          status?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string | null
        }
      }
      // Assuming you might have this table based on previous code snippets
      ai_config: {
        Row: {
          id: string
          enabled: boolean
          respond_to_all: boolean
          system_prompt: string | null
          keywords: string[] | null
          typing_delays: Json | null // Assuming JSONB storage for nested object
          unavailability_keywords: string[] | null
          pause_bot_on_price_offer: boolean
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          enabled?: boolean
          respond_to_all?: boolean
          system_prompt?: string | null
          keywords?: string[] | null
          typing_delays?: Json | null
          unavailability_keywords?: string[] | null
          pause_bot_on_price_offer?: boolean
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          enabled?: boolean
          respond_to_all?: boolean
          system_prompt?: string | null
          keywords?: string[] | null
          typing_delays?: Json | null
          unavailability_keywords?: string[] | null
          pause_bot_on_price_offer?: boolean
          active?: boolean
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      // Define the ENUM type if you created it in SQL
      conversation_state: "active" | "negotiation" | "manual" | "completed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
