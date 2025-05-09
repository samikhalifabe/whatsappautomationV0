import { useState } from "react"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/types/supabase"

type ContactHistory = Database["public"]["Tables"]["contact_history"]["Row"]

export function useContactHistory() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function fetchContactHistoryByRecordId(contactRecordId: string) {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from("contact_history")
        .select("*")
        .eq("contact_record_id", contactRecordId)
        .order("contact_date", { ascending: false })

      if (error) throw error
      return data || []
    } catch (err: any) {
      console.error("Error fetching contact history:", err)
      setError(err.message)
      return []
    } finally {
      setLoading(false)
    }
  }

  async function addContactHistoryEntry(entry: Database["public"]["Tables"]["contact_history"]["Insert"]) {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from("contact_history")
        .insert(entry)
        .select()

      if (error) throw error
      return data[0]
    } catch (err: any) {
      console.error("Error adding contact history entry:", err)
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  async function updateContactHistoryEntry(
    id: string,
    updates: Database["public"]["Tables"]["contact_history"]["Update"]
  ) {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from("contact_history")
        .update(updates)
        .eq("id", id)
        .select()

      if (error) throw error
      return data[0]
    } catch (err: any) {
      console.error("Error updating contact history entry:", err)
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  async function deleteContactHistoryEntry(id: string) {
    try {
      setLoading(true)
      setError(null)

      const { error } = await supabase
        .from("contact_history")
        .delete()
        .eq("id", id)

      if (error) throw error
    } catch (err: any) {
      console.error("Error deleting contact history entry:", err)
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Function to add a WhatsApp message to contact history
  async function logWhatsAppMessage(
    contactRecordId: string,
    message: string,
    userId: string
  ) {
    const entry = {
      contact_record_id: contactRecordId,
      contact_date: new Date().toISOString(),
      contact_type: "WhatsApp",
      notes: message,
      user_id: userId
    }

    return addContactHistoryEntry(entry)
  }

  return {
    loading,
    error,
    fetchContactHistoryByRecordId,
    addContactHistoryEntry,
    updateContactHistoryEntry,
    deleteContactHistoryEntry,
    logWhatsAppMessage
  }
}
