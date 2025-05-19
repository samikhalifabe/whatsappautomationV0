"use client"

"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/types/supabase"

type Vehicle = Database["public"]["Tables"]["vehicles"]["Row"]

export function useVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Pagination state
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(30) // Limiter à 30 véhicules pour de meilleures performances
  const [totalCount, setTotalCount] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  const fetchVehicles = useCallback(
    async (pageToFetch = 1) => {
      try {
        setLoading(true)
        setError(null)

        // First get the total count
        const { count, error: countError } = await supabase.from("vehicles").select("*", { count: "exact", head: true })

        if (countError) throw countError
        setTotalCount(count || 0)

        // Then fetch the page
        const from = (pageToFetch - 1) * pageSize
        const to = from + pageSize - 1

        const { data, error } = await supabase
          .from("vehicles")
          .select("*")
          .range(from, to)
          .order("created_at", { ascending: false })

        if (error) throw error

        if (pageToFetch === 1) {
          setVehicles(data || [])
        } else {
          // Append to existing vehicles for continuous loading
          setVehicles((prev) => [...prev, ...(data || [])])
        }

        // Check if there are more vehicles to load
        setHasMore((data?.length || 0) === pageSize)
        setPage(pageToFetch)
      } catch (err: any) {
        console.error("Error fetching vehicles:", err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    },
    [pageSize],
  )

  // Load more vehicles
  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      fetchVehicles(page + 1)
    }
  }, [fetchVehicles, page, hasMore, loading])

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
  }, [fetchVehicles])

  return {
    vehicles,
    loading,
    error,
    fetchVehicles,
    loadMore,
    hasMore,
    totalCount,
    page,
    setPageSize,
    getVehicleById,
    addVehicle,
    updateVehicle,
    deleteVehicle,
  }
}
