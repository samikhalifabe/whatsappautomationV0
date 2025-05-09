export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      conversations: {
        Row: {
          id: string
          vehicle_id: string | null
          phone_number: string
          chat_id: string | null
          status: string
          last_message_at: string
          created_at: string
          updated_at: string
          user_id: string | null
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
        }
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          body: string
          is_from_me: boolean
          message_id: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
