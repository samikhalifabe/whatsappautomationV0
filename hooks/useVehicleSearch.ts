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
      limit: 50, // Ensure pagination limit matches searchParams limit
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
      // Construct URL with all parameters
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

      // Update search parameters state
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
          limit: searchParams.limit, // Use searchParams limit for pagination result
          total: 0,
          totalPages: 0
        }
      })
    } finally {
      setLoading(false)
    }
  }, [searchParams])

  // Function to reset filters
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

  // Selection of vehicles (unchanged)
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

  // Function to fetch all vehicle IDs matching current search parameters
  const fetchAllVehicleIds = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Use current searchParams but override pagination to get all results
      const params = { ...searchParams, page: 1, limit: 999999 }; // Fetch all by setting a very high limit
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
      });

      // Request only IDs to minimize data transfer
      const response = await axios.get(`/api/vehicles/search?${queryParams.toString()}&select=id`);

      // Assuming the API returns an array of vehicle objects with only the 'id' property
      const allIds = response.data.vehicles.map((vehicle: { id: string }) => vehicle.id);
      return allIds;

    } catch (err: any) {
      console.error("Error fetching all vehicle IDs:", err);
      setError(typeof err === "string" ? err : err.message || "Une erreur est survenue lors de la récupération de tous les IDs");
      return []; // Return empty array on error
    } finally {
      setLoading(false);
    }
  }, [searchParams]); // searchParams is a dependency because the query depends on it

  // Function to fetch vehicle objects by their IDs
  const fetchVehiclesByIds = useCallback(async (ids: string[]) => {
    if (ids.length === 0) {
      return [];
    }
    setLoading(true);
    setError(null);

    try {
      // Call the API route with a list of IDs
      // Assuming the API route can handle a list of IDs in the query parameters
      // We might need to modify the API route to support this.
      // For now, let's assume we can pass a comma-separated string of IDs.
      // A better approach would be a POST request with the IDs in the body,
      // or modifying the GET /api/vehicles/search to accept an 'ids' parameter.
      // Let's modify the GET /api/vehicles/search to accept an 'ids' query parameter.

      const queryParams = new URLSearchParams({
        ids: ids.join(',') // Pass IDs as a comma-separated string
      });

      const response = await axios.get(`/api/vehicles/search?${queryParams.toString()}`);

      // Assuming the API returns an array of full vehicle objects
      return response.data.vehicles;

    } catch (err: any) {
      console.error("Error fetching vehicles by IDs:", err);
      setError(typeof err === "string" ? err : err.message || "Une erreur est survenue lors de la récupération des véhicules par IDs");
      return []; // Return empty array on error
    } finally {
      setLoading(false);
    }
  }, []); // No dependencies needed as it takes IDs as input


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
    searchHistory, // Return search history
    fetchAllVehicleIds, // Add new function to fetch all vehicle IDs
    fetchVehiclesByIds // Add new function to fetch vehicles by IDs
  }
}
