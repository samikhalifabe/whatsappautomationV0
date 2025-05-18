"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"

// Définir un type pour les contacts avec des valeurs par défaut
type ContactRecord = {
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

export function useContacts() {
  const [contacts, setContacts] = useState<ContactRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tableExists, setTableExists] = useState(true)

  // Vérifier si la table existe
  async function checkTableExists() {
    try {
      const { error } = await supabase.from("contact_records").select("id").limit(1)

      if (error && error.message.includes("does not exist")) {
        console.warn("Table contact_records does not exist. Using fallback data.")
        setTableExists(false)
        return false
      }

      return true
    } catch (err) {
      console.warn("Error checking table existence:", err)
      setTableExists(false)
      return false
    }
  }

  async function fetchContacts() {
    try {
      setLoading(true)
      setError(null)

      // Vérifier si la table existe
      const exists = await checkTableExists()

      if (!exists) {
        // Utiliser des données fictives si la table n'existe pas
        setContacts([])
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from("contact_records")
        .select("*")
        .order("latest_contact_date", { ascending: false })

      if (error) throw error
      setContacts(data || [])
    } catch (err: any) {
      console.error("Error fetching contacts:", err)
      setError(err.message)
      // Ne pas bloquer l'application, définir un tableau vide
      setContacts([])
    } finally {
      setLoading(false)
    }
  }

  async function fetchContactsByVehicleId(vehicleId: string) {
    try {
      setLoading(true)
      setError(null)

      // Vérifier si la table existe
      const exists = await checkTableExists()

      if (!exists) {
        return []
      }

      const { data, error } = await supabase
        .from("contact_records")
        .select("*")
        .eq("vehicle_id", vehicleId)
        .order("latest_contact_date", { ascending: false })

      if (error) throw error
      return data || []
    } catch (err: any) {
      console.error("Error fetching contacts by vehicle ID:", err)
      return []
    } finally {
      setLoading(false)
    }
  }

  async function getContactById(id: string) {
    try {
      // Vérifier si la table existe
      const exists = await checkTableExists()

      if (!exists) {
        return null
      }

      const { data, error } = await supabase.from("contact_records").select("*").eq("id", id).single()

      if (error) throw error
      return data
    } catch (err: any) {
      console.error("Error fetching contact by ID:", err)
      return null
    }
  }

  async function addContact(contact: Partial<ContactRecord>) {
    try {
      // Vérifier si la table existe
      const exists = await checkTableExists()

      if (!exists) {
        console.warn("Cannot add contact: table does not exist")
        return null
      }

      const { data, error } = await supabase.from("contact_records").insert(contact).select()

      if (error) throw error

      // Update the local state with the new contact
      setContacts((prev) => [...prev, data[0]])

      return data[0]
    } catch (err: any) {
      console.error("Error adding contact:", err)
      return null
    }
  }

  async function updateContact(id: string, updates: Partial<ContactRecord>) {
    try {
      // Vérifier si la table existe
      const exists = await checkTableExists()

      if (!exists) {
        console.warn("Cannot update contact: table does not exist")
        return null
      }

      const { data, error } = await supabase.from("contact_records").update(updates).eq("id", id).select()

      if (error) throw error

      // Update the local state with the updated contact
      setContacts((prev) => prev.map((contact) => (contact.id === id ? data[0] : contact)))

      return data[0]
    } catch (err: any) {
      console.error("Error updating contact:", err)
      return null
    }
  }

  async function deleteContact(id: string) {
    try {
      // Vérifier si la table existe
      const exists = await checkTableExists()

      if (!exists) {
        console.warn("Cannot delete contact: table does not exist")
        return
      }

      const { error } = await supabase.from("contact_records").delete().eq("id", id)

      if (error) throw error

      // Update the local state by removing the deleted contact
      setContacts((prev) => prev.filter((contact) => contact.id !== id))
    } catch (err: any) {
      console.error("Error deleting contact:", err)
    }
  }

  async function getContactedVehicleIds() {
    try {
      // Vérifier si la table existe
      const exists = await checkTableExists()

      if (!exists) {
        return []
      }

      const { data, error } = await supabase
        .from("contact_records")
        .select("vehicle_id")
        .eq("status", "Contacté")
        .not("vehicle_id", "is", null)

      if (error) throw error
      return data ? data.map((record) => record.vehicle_id) : []
    } catch (err: any) {
      console.error("Error fetching contacted vehicle IDs:", err)
      return []
    }
  }

  useEffect(() => {
    fetchContacts()
  }, [])

  return {
    contacts,
    loading,
    error,
    tableExists,
    fetchContacts,
    fetchContactsByVehicleId,
    getContactById,
    addContact,
    updateContact,
    deleteContact,
    getContactedVehicleIds,
  }
}
