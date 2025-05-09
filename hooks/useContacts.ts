import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/types/supabase"

type ContactRecord = Database["public"]["Tables"]["contact_records"]["Row"]

export function useContacts() {
  const [contacts, setContacts] = useState<ContactRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function fetchContacts() {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from("contact_records")
        .select("*")
        .order("latest_contact_date", { ascending: false })

      if (error) throw error
      setContacts(data || [])
    } catch (err: any) {
      console.error("Error fetching contacts:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function fetchContactsByVehicleId(vehicleId: string) {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from("contact_records")
        .select("*")
        .eq("vehicle_id", vehicleId)
        .order("latest_contact_date", { ascending: false })

      if (error) throw error
      return data || []
    } catch (err: any) {
      console.error("Error fetching contacts by vehicle ID:", err)
      throw err
    } finally {
      setLoading(false)
    }
  }

  async function getContactById(id: string) {
    try {
      const { data, error } = await supabase
        .from("contact_records")
        .select("*")
        .eq("id", id)
        .single()

      if (error) throw error
      return data
    } catch (err: any) {
      console.error("Error fetching contact by ID:", err)
      throw err
    }
  }

  async function addContact(contact: Database["public"]["Tables"]["contact_records"]["Insert"]) {
    try {
      const { data, error } = await supabase
        .from("contact_records")
        .insert(contact)
        .select()

      if (error) throw error
      
      // Update the local state with the new contact
      setContacts((prev) => [...prev, data[0]])
      
      return data[0]
    } catch (err: any) {
      console.error("Error adding contact:", err)
      throw err
    }
  }

  async function updateContact(id: string, updates: Database["public"]["Tables"]["contact_records"]["Update"]) {
    try {
      const { data, error } = await supabase
        .from("contact_records")
        .update(updates)
        .eq("id", id)
        .select()

      if (error) throw error
      
      // Update the local state with the updated contact
      setContacts((prev) => 
        prev.map((contact) => (contact.id === id ? data[0] : contact))
      )
      
      return data[0]
    } catch (err: any) {
      console.error("Error updating contact:", err)
      throw err
    }
  }

  async function deleteContact(id: string) {
    try {
      const { error } = await supabase
        .from("contact_records")
        .delete()
        .eq("id", id)

      if (error) throw error
      
      // Update the local state by removing the deleted contact
      setContacts((prev) => prev.filter((contact) => contact.id !== id))
    } catch (err: any) {
      console.error("Error deleting contact:", err)
      throw err
    }
  }

  useEffect(() => {
    fetchContacts()
  }, [])

  async function getContactedVehicleIds() {
    try {
      const { data, error } = await supabase
        .from("contact_records")
        .select("vehicle_id")
        .eq("status", "Contacté")
        .not("vehicle_id", "is", null)

      if (error) throw error
      return data ? data.map(record => record.vehicle_id) : []
    } catch (err: any) {
      console.error("Error fetching contacted vehicle IDs:", err)
      return []
    }
  }

  return {
    contacts,
    loading,
    error,
    fetchContacts,
    fetchContactsByVehicleId,
    getContactById,
    addContact,
    updateContact,
    deleteContact,
    getContactedVehicleIds,
  }
}
