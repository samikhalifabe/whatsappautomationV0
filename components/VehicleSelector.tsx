"use client"

import { useEffect, useCallback, useState } from "react" // Added useState
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Car, MapPin, Banknote, Gauge, Fuel, Phone, MessageCircle, Building,
  Search, Filter, CheckSquare, X, ChevronRight, Loader2
} from "lucide-react"
import { useVehicleSearch } from "@/hooks/useVehicleSearch"
import { cn } from "@/lib/utils"
import type { Vehicle } from "../types/vehicles"

interface VehicleSelectorProps {
  onVehiclesSelected: (vehicles: Vehicle[]) => void
  selectedVehicles?: Vehicle[]
}

export default function VehicleSelector({ onVehiclesSelected, selectedVehicles = [] }: VehicleSelectorProps) {
  const {
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
    searchHistory
  } = useVehicleSearch()

  // State for showing/hiding filters
  const [showFilters, setShowFilters] = useState(false); // Added state

  // Initialiser selectedVehicleIds avec les IDs des véhicules déjà sélectionnés
  useEffect(() => {
    if (selectedVehicles.length > 0) {
      setSelectedVehicleIds(selectedVehicles.map(vehicle => vehicle.id))
    }
  }, [selectedVehicles, setSelectedVehicleIds])

  // Gestionnaire de changement pour les paramètres de recherche
  const handleFilterChange = useCallback((key: keyof typeof searchParams, value: any) => {
    search({ [key]: value, page: 1 }) // Réinitialiser à la page 1 lors du changement de filtre
  }, [search])

  // Gestionnaire pour la soumission du formulaire de recherche
  const handleSearchSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    submitSearch()
  }, [submitSearch])

  const confirmSelection = useCallback(() => {
    const selected = getSelectedVehicles()
    onVehiclesSelected(selected)
  }, [getSelectedVehicles, onVehiclesSelected])

  // Compter le nombre de filtres actifs
  const activeFiltersCount = [
    searchParams.contactStatus !== "all",
    searchParams.sellerType !== "all",
    searchParams.minPrice > 0 || searchParams.maxPrice < 100000, // Assuming maxPrice is 100000 by default
    searchParams.minYear > 2000 || searchParams.maxYear < new Date().getFullYear(), // Assuming minYear is 2000 by default
  ].filter(Boolean).length

  // Add keyboard shortcut for search input focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt+F to focus on the search input
      if (e.altKey && e.key === 'f') {
        e.preventDefault()
        const searchInput = document.getElementById('vehicle-search-input')
        if (searchInput) {
          searchInput.focus()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])


  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Car className="h-5 w-5 text-[#25D366]" />
            Sélection des véhicules
          </h2>
          <p className="text-sm text-muted-foreground">
            Sélectionnez les véhicules auxquels vous souhaitez envoyer des messages
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showFilters ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="h-9"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtres
            {activeFiltersCount > 0 && <Badge className="ml-1 bg-white text-black">{activeFiltersCount}</Badge>}
          </Button>
          <Select value={searchParams.sortBy} onValueChange={(value) => handleFilterChange('sortBy', value)}>
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue placeholder="Trier par..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Par défaut</SelectItem>
              <SelectItem value="price_asc">Prix (croissant)</SelectItem>
              <SelectItem value="price_desc">Prix (décroissant)</SelectItem>
              <SelectItem value="year_desc">Année (récent d'abord)</SelectItem>
              <SelectItem value="year_asc">Année (ancien d'abord)</SelectItem>
              <SelectItem value="brand_asc">Marque (A-Z)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Barre de recherche avec formulaire */}
      <div className="px-4">
        <form onSubmit={handleSearchSubmit}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="vehicle-search-input" // Added ID for keyboard shortcut
              placeholder="Rechercher par marque, modèle, localisation..."
              value={searchInputValue}
              onChange={(e) => updateSearchInputValue(e.target.value)}
              className="pl-10 pr-20 h-10"
            />
            {searchInputValue && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-12 top-1/2 transform -translate-y-1/2 h-8 w-8"
                onClick={() => {
                  updateSearchInputValue("")
                  if (searchParams.searchTerm) {
                    search({ searchTerm: "", page: 1 })
                  }
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            <Button
              type="submit"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8"
              size="sm"
              variant="default"
            >
              Rechercher
            </Button>
          </div>
        </form>
        {/* Helper text */}
        <p className="text-xs text-muted-foreground mt-1">
          Tapez votre recherche et appuyez sur Entrée ou cliquez sur Rechercher pour lancer la recherche parmi tous les véhicules.
        </p>
        {/* Search History */}
        {searchHistory.length > 0 && searchInputValue === "" && (
          <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white dark:bg-slate-800 border rounded-md shadow-lg">
            <div className="p-2 text-xs text-slate-500">Recherches récentes</div>
            {searchHistory.map((term, index) => (
              <div
                key={index}
                className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer flex items-center"
                onClick={() => {
                  updateSearchInputValue(term)
                  submitSearch()
                }}
              >
                <Search className="h-3 w-3 mr-2 text-slate-400" />
                {term}
              </div>
            ))}
          </div>
        )}
      </div>


      {/* Filtres avancés */}
      {showFilters && (
        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-md border animate-fadeIn">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium">Filtres avancés</h3>
            <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8 text-xs">
              Réinitialiser
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium">Statut de contact</label>
                <div className="flex mt-1 space-x-2">
                  <Button
                    variant={searchParams.contactStatus === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleFilterChange('contactStatus', 'all')}
                    className="h-8 text-xs"
                  >
                    Tous
                  </Button>
                  <Button
                    variant={searchParams.contactStatus === "contacted" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleFilterChange('contactStatus', 'contacted')}
                    className="h-8 text-xs"
                  >
                    <MessageCircle className="h-3.5 w-3.5 mr-1" />
                    Contactés
                  </Button>
                  <Button
                    variant={searchParams.contactStatus === "not_contacted" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleFilterChange('contactStatus', 'not_contacted')}
                    className="h-8 text-xs"
                  >
                    <MessageCircle className="h-3.5 w-3.5 mr-1" />
                    Non contactés
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium">Type de vendeur</label>
                <div className="flex mt-1 space-x-2">
                  <Button
                    variant={searchParams.sellerType === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleFilterChange('sellerType', 'all')}
                    className="h-8 text-xs"
                  >
                    Tous
                  </Button>
                  <Button
                    variant={searchParams.sellerType === "particulier" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleFilterChange('sellerType', 'particulier')}
                    className="h-8 text-xs"
                  >
                    <Phone className="h-3.5 w-3.5 mr-1" />
                    Particulier
                  </Button>
                  <Button
                    variant={searchParams.sellerType === "professionnel" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleFilterChange('sellerType', 'professionnel')}
                    className="h-8 text-xs"
                  >
                    <Building className="h-3.5 w-3.5 mr-1" />
                    Professionnel
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium">Numéro de téléphone</label>
                <div className="flex mt-1 space-x-2">
                  <Button
                    variant={searchParams.showOnlyWithPhone ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleFilterChange('showOnlyWithPhone', true)}
                    className="h-8 text-xs"
                  >
                    <Phone className="h-3.5 w-3.5 mr-1" />
                    Avec téléphone
                  </Button>
                  <Button
                    variant={!searchParams.showOnlyWithPhone ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleFilterChange('showOnlyWithPhone', false)}
                    className="h-8 text-xs"
                  >
                    Tous les véhicules
                  </Button>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium">Plage de prix</label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    type="number"
                    value={searchParams.minPrice}
                    onChange={(e) => handleFilterChange('minPrice', Number.parseInt(e.target.value) || 0)}
                    className="h-8 text-xs"
                  />
                  <span className="text-xs">à</span>
                  <Input
                    type="number"
                    value={searchParams.maxPrice}
                    onChange={(e) => handleFilterChange('maxPrice', Number.parseInt(e.target.value) || 0)}
                    className="h-8 text-xs"
                  />
                  <span className="text-xs">€</span>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium">Année</label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    type="number"
                    value={searchParams.minYear}
                    onChange={(e) => handleFilterChange('minYear', Number.parseInt(e.target.value) || 0)}
                    className="h-8 text-xs"
                  />
                  <span className="text-xs">à</span>
                  <Input
                    type="number"
                    value={searchParams.maxYear}
                    onChange={(e) => handleFilterChange('maxYear', Number.parseInt(e.target.value) || 0)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Liste des véhicules */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="select-all"
              checked={selectedVehicleIds.length > 0 && selectedVehicleIds.length === results.vehicles.length}
              onCheckedChange={selectAllVehicles}
            />
            <label htmlFor="select-all" className="text-sm">
              Sélectionner tout ({selectedVehicleIds.length}/{results.vehicles.length})
            </label>
          </div>
          <Button
            size="sm"
            onClick={confirmSelection}
            disabled={selectedVehicleIds.length === 0}
            className="h-9 bg-[#25D366] hover:bg-[#128C7E] text-white"
          >
            <CheckSquare className="h-4 w-4 mr-2" />
            Utiliser la sélection ({selectedVehicleIds.length})
          </Button>
        </div>

        <div className="h-[500px] border rounded-md overflow-y-auto">
          {" "}
          {/* Use a div with overflow-y-auto instead of ScrollArea */}
          {loading && results.vehicles.length === 0 ? ( // Show initial loading spinner
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 rounded-full border-2 border-[#25D366] border-t-transparent animate-spin"></div>
                <p className="text-sm text-muted-foreground">Chargement des véhicules...</p>
              </div>
            </div>
          ) : results.vehicles.length > 0 ? ( // Use results.vehicles here
            <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                {results.vehicles.map( // Use results.vehicles here
                  (
                    vehicle, index
                  ) => (
                  <div
                    key={`${vehicle.id}-${index}`}
                    className={cn(
                      "flex flex-col rounded-md border transition-colors",
                      selectedVehicleIds.includes(vehicle.id)
                        ? "border-[#25D366] bg-[#25D366]/5"
                        : "border-slate-200 hover:border-slate-300 bg-white dark:bg-slate-900",
                      vehicle.contact_status === "contacted" ? "opacity-80" : "",
                    )}
                  >
                    <div className="flex items-start p-3">
                      <Checkbox
                        id={`vehicle-${vehicle.id}`}
                        checked={selectedVehicleIds.includes(vehicle.id)}
                        onCheckedChange={() => toggleVehicleSelection(vehicle.id)}
                        className="mt-1 mr-3"
                      />
                      <div className="flex items-start gap-3 flex-1">
                        {vehicle.image_url ? (
                          <div className="flex-shrink-0 h-16 w-16 rounded-md overflow-hidden">
                            <img
                              src={vehicle.image_url || "/placeholder.svg"}
                              alt={`${vehicle.brand || "N/A"} ${vehicle.model || "N/A"}`}
                              className="h-full w-full object-cover"
                              loading="lazy" // Add lazy loading attribute
                              onError={(e) => {
                                ;(e.target as HTMLImageElement).src =
                                  "https://placehold.co/64x64/gray/white?text=No+Image"
                              }}
                            />
                          </div>
                        ) : (
                          <div className="flex-shrink-0 h-16 w-16 rounded-md bg-slate-100 flex items-center justify-center">
                            <Car className="h-8 w-8 text-slate-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">
                            {vehicle.brand || "N/A"} {vehicle.model || "N/A"} {vehicle.year ? `(${vehicle.year})` : ""}
                          </div>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {vehicle.price && (
                              <Badge variant="outline" className="text-xs flex items-center gap-1 bg-slate-50">
                                <Banknote className="h-3 w-3" />
                                {vehicle.price.toLocaleString("fr-FR")} €
                              </Badge>
                            )}
                            {vehicle.mileage && (
                              <Badge variant="outline" className="text-xs flex items-center gap-1 bg-slate-50">
                                <Gauge className="h-3 w-3" />
                                {vehicle.mileage.toLocaleString("fr-FR")} km
                              </Badge>
                            )}
                            {vehicle.fuel_type && (
                              <Badge variant="outline" className="text-xs flex items-center gap-1 bg-slate-50">
                                <Fuel className="h-3 w-3" />
                                {vehicle.fuel_type}
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {vehicle.location && (
                              <Badge variant="outline" className="text-xs flex items-center gap-1 bg-slate-50">
                                <MapPin className="h-3 w-3" />
                                {vehicle.location}
                              </Badge>
                            )}
                            {vehicle.phone && (
                              <Badge variant="outline" className="text-xs flex items-center gap-1 bg-slate-50">
                                <Phone className="h-3 w-3" />
                                {vehicle.phone}
                              </Badge>
                            )}
                            {vehicle.contact_status === "contacted" && (
                              <Badge
                                variant="outline"
                                className="text-xs flex items-center gap-1 text-green-600 border-green-600 bg-green-50"
                              >
                                <MessageCircle className="h-3 w-3" />
                                Contacté
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    {vehicle.listing_url && (
                      <div className="px-3 py-1.5 border-t text-xs">
                        <a
                          href={vehicle.listing_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center text-[#25D366] hover:underline"
                        >
                          Voir l'annonce
                          <ChevronRight className="h-3 w-3 ml-1" />
                        </a>
                      </div>
                    )}
                  </div>
                ),
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-10 text-center">
              <Car className="h-12 w-12 text-muted-foreground opacity-20 mb-3" />
              <p className="text-muted-foreground">
                {searchParams.searchTerm || activeFiltersCount > 0
                  ? "Aucun véhicule trouvé avec les critères actuels."
                  : "Aucun véhicule trouvé."}
              </p>
              {(searchParams.searchTerm || activeFiltersCount > 0) && (
                <Button variant="link" size="sm" onClick={resetFilters} className="mt-2">
                  Réinitialiser les filtres
                </Button>
              )}
            </div>
          )}
          {/* Load More Button */}
          {results.pagination.page < results.pagination.totalPages && (
            <div className="p-4 text-center">
              <Button onClick={() => search({ page: searchParams.page + 1 })} disabled={loading} variant="outline">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Chargement...
                  </>
                ) : (
                  "Charger plus de véhicules"
                )}
              </Button>
            </div>
          )}
          {!loading && results.vehicles.length > 0 && (
            <div className="p-4 text-center text-muted-foreground text-sm">
              Affichage de {results.vehicles.length} sur {results.pagination.total} véhicules
            </div>
          )}
        </div>
      </div>
      {results.pagination.page < results.pagination.totalPages && (
        <div className="flex justify-center p-4 border-t">
          <Button variant="outline" onClick={() => search({ page: searchParams.page + 1 })} disabled={loading} className="w-full max-w-md">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Chargement...
              </>
            ) : (
              <>Charger plus de véhicules</>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
