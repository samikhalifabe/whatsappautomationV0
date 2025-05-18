"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/types/supabase"

type Vehicle = Database["public"]["Tables"]["vehicles"]["Row"]

export function useVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function fetchVehicles() {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase.from("vehicles").select("*").order("created_at", { ascending: false })

      if (error) throw error
      setVehicles(data || [])
    } catch (err: any) {
      console.error("Error fetching vehicles:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function getVehicleById(id: string) {
    try {
      const { data, error } = await supabase.from("vehicles").select("*").eq("id", id).single()

      if (error) throw error
      return data
    } catch (err: any) {
      console.error("Error fetching vehicle by ID:", err)
      throw err
    }
  }

  async function addVehicle(vehicle: Database["public"]["Tables"]["vehicles"]["Insert"]) {
    try {
      const { data, error } = await supabase.from("vehicles").insert(vehicle).select()

      if (error) throw error

      // Update the local state with the new vehicle
      setVehicles((prev) => [...prev, data[0]])

      return data[0]
    } catch (err: any) {
      console.error("Error adding vehicle:", err)
      throw err
    }
  }

  async function updateVehicle(id: string, updates: Database["public"]["Tables"]["vehicles"]["Update"]) {
    try {
      const { data, error } = await supabase.from("vehicles").update(updates).eq("id", id).select()

      if (error) throw error

      // Update the local state with the updated vehicle
      setVehicles((prev) => prev.map((vehicle) => (vehicle.id === id ? data[0] : vehicle)))

      return data[0]
    } catch (err: any) {
      console.error("Error updating vehicle:", err)
      throw err
    }
  }

  async function deleteVehicle(id: string) {
    try {
      const { error } = await supabase.from("vehicles").delete().eq("id", id)

      if (error) throw error

      // Update the local state by removing the deleted vehicle
      setVehicles((prev) => prev.filter((vehicle) => vehicle.id !== id))
    } catch (err: any) {
      console.error("Error deleting vehicle:", err)
      throw err
    }
  }

  useEffect(() => {
    fetchVehicles()
  }, [])

  return {
    vehicles,
    loading,
    error,
    fetchVehicles,
    getVehicleById,
    addVehicle,
    updateVehicle,
    deleteVehicle,
  }
}
