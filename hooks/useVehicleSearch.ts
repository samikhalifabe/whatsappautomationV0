"use client"

import { useState, useCallback, useEffect } from "react"
import axios from "axios"
import type { Vehicle } from "../types/vehicles" // Corrected path

// Define interfaces and types (assuming these were defined before in the original hook)
interface SearchParams {
  searchTerm: string
  contactStatus: "all" | "contacted" | "not_contacted"
  sellerType: "all" | "particulier" | "professionnel"
  minPrice: number
  maxPrice: number
  minYear: number
  maxYear: number
  showOnlyWithPhone: boolean
  sortBy: string
  page: number
  limit: number
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface SearchResult {
  vehicles: Vehicle[]
  pagination: Pagination
}


export function useVehicleSearch() {
  const [searchParams, setSearchParams] = useState<SearchParams>({
    searchTerm: "",
    contactStatus: "all",
    sellerType: "all",
    minPrice: 0,
    maxPrice: 100000,
    minYear: 2000,
    maxYear: new Date().getFullYear(),
    showOnlyWithPhone: true,
    sortBy: "created_at_desc", // Changed default sort to a valid column
    page: 1,
    limit: 50, // Changed limit to 50
  })

  const [results, setResults] = useState<SearchResult>({
    vehicles: [],
    pagination: {
      page: 1,
      limit: 30,
      total: 0,
      totalPages: 0
    }
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>([])

  // État local pour stocker le terme de recherche en cours de saisie
  const [searchInputValue, setSearchInputValue] = useState("")

  // Fonction pour mettre à jour le terme de recherche temporaire sans déclencher de recherche
  const updateSearchInputValue = useCallback((value: string) => {
    setSearchInputValue(value)
  }, [])

  // Fonction qui effectue réellement la recherche
  const search = useCallback(async (newParams?: Partial<SearchParams>) => {
    const params = { ...searchParams, ...newParams }
    setLoading(true)
    setError(null)

    try {
      // Construire l'URL avec tous les paramètres
      const queryParams = new URLSearchParams({
        search: params.searchTerm,
        contactStatus: params.contactStatus,
        sellerType: params.sellerType,
        minPrice: params.minPrice.toString(),
        maxPrice: params.maxPrice.toString(),
        minYear: params.minYear.toString(),
        maxYear: params.maxYear.toString(),
        showOnlyWithPhone: params.showOnlyWithPhone.toString(),
        sortBy: params.sortBy,
        page: params.page.toString(),
        limit: params.limit.toString()
      })

      const response = await axios.get(`/api/vehicles/search?${queryParams.toString()}`)
      setResults(response.data)

      // Mettre à jour les paramètres de recherche
      if (newParams) {
        setSearchParams(params)
      }
    } catch (err: any) { // Added type any for error
      console.error("Error searching vehicles:", err)
      setError(typeof err === "string" ? err : err.message || "Une erreur est survenue lors de la recherche") // Improved error handling
      setResults({
        vehicles: [],
        pagination: {
          page: 1,
          limit: 30,
          total: 0,
          totalPages: 0
        }
      })
    } finally {
      setLoading(false)
    }
  }, [searchParams])

  // Fonction pour réinitialiser les filtres
  const resetFilters = useCallback(() => {
    setSearchInputValue("")
    search({
      searchTerm: "",
      contactStatus: "all",
      sellerType: "all",
      minPrice: 0,
      maxPrice: 100000,
      minYear: 2000,
      maxYear: new Date().getFullYear(),
      sortBy: "default",
      page: 1
    })
  }, [search])

  // Sélection de véhicules (inchangé)
  const toggleVehicleSelection = useCallback((id: string) => {
    setSelectedVehicleIds(prev =>
      prev.includes(id)
        ? prev.filter(vehicleId => vehicleId !== id)
        : [...prev, id]
    )
  }, [])

  const selectAllVehicles = useCallback(() => {
    const allIds = results.vehicles.map(v => v.id)
    if (selectedVehicleIds.length === allIds.length) {
      setSelectedVehicleIds([])
    } else {
      setSelectedVehicleIds(allIds)
    }
  }, [results.vehicles, selectedVehicleIds])

  const getSelectedVehicles = useCallback(() => {
    return results.vehicles.filter(v => selectedVehicleIds.includes(v.id))
  }, [results.vehicles, selectedVehicleIds])

  // Initial search on mount
  useEffect(() => {
    search()
  }, [search])

  // Search History (added based on user feedback)
  const [searchHistory, setSearchHistory] = useState<string[]>([])

  const submitSearchWithHistory = useCallback(() => {
    // Only add non-empty and non-duplicate search terms to history
    if (searchInputValue && !searchHistory.includes(searchInputValue)) {
      setSearchHistory(prev => [searchInputValue, ...prev].slice(0, 5)); // Keep the 5 most recent
    }
    search({ searchTerm: searchInputValue, page: 1 });
  }, [search, searchInputValue, searchHistory]); // Added searchHistory to dependencies

  // Corrected submitSearch to use the history logic
  const submitSearch = submitSearchWithHistory;


  return {
    searchParams,
    searchInputValue,
    results,
    loading,
    error,
    selectedVehicleIds,
    search,
    updateSearchInputValue,
    submitSearch,
    resetFilters,
    toggleVehicleSelection,
    selectAllVehicles,
    getSelectedVehicles,
    setSelectedVehicleIds,
    searchHistory // Return search history
  }
}
