"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area" // Keep ScrollArea for pagination controls wrapper
import { Checkbox } from "@/components/ui/checkbox"
import { FixedSizeGrid } from 'react-window' // Import FixedSizeGrid
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Car,
  MapPin,
  Banknote,
  Gauge,
  Fuel,
  Phone,
  MessageCircle,
  Building,
  Search,
  Filter,
  CheckSquare,
  X,
  ChevronRight,
} from "lucide-react"
import { useVehicles } from "@/hooks/useVehicles"
import { cn } from "@/lib/utils"
import type { Vehicle } from "../types/vehicles"

interface VehicleSelectorProps {
  onVehiclesSelected: (vehicles: Vehicle[]) => void
  selectedVehicles?: Vehicle[] // Ajouter cette prop pour recevoir les véhicules déjà sélectionnés
}

export default function VehicleSelector({ onVehiclesSelected, selectedVehicles = [] }: VehicleSelectorProps) {
  const { vehicles, loading: loadingVehicles } = useVehicles()

  // Initialiser selectedVehicleIds avec les IDs des véhicules déjà sélectionnés
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>(selectedVehicles.map((vehicle) => vehicle.id))

  // Mettre à jour selectedVehicleIds quand selectedVehicles change
  useEffect(() => {
    setSelectedVehicleIds(selectedVehicles.map((vehicle) => vehicle.id))
  }, [selectedVehicles])

  const [searchTerm, setSearchTerm] = useState("")
  const [contactStatusFilter, setContactStatusFilter] = useState<"all" | "contacted" | "not_contacted">("all")
  const [sellerTypeFilter, setSellerTypeFilter] = useState<"all" | "particulier" | "professionnel">("all")
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000])
  const [yearRange, setYearRange] = useState<[number, number]>([2000, new Date().getFullYear()])
  const [showFilters, setShowFilters] = useState(false)
  const [sortBy, setSortBy] = useState<string>("default")
  const [showOnlyWithPhone, setShowOnlyWithPhone] = useState(true)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50 // Display only 50 vehicles at a time

  // Calculer les valeurs min/max pour les filtres
  const minPrice = Math.min(...vehicles.filter((v) => v.price).map((v) => v.price || 0), 0)
  const maxPrice = Math.max(...vehicles.filter((v) => v.price).map((v) => v.price || 0), 100000)
  const minYear = Math.min(...vehicles.filter((v) => v.year).map((v) => v.year || 0), 2000)
  const maxYear = Math.max(...vehicles.filter((v) => v.year).map((v) => v.year || 0), new Date().getFullYear())

  // Initialiser les plages de prix et d'année
  useEffect(() => {
    if (vehicles.length > 0) {
      setPriceRange([minPrice, maxPrice])
      setYearRange([minYear, maxYear])
    }
  }, [vehicles.length, minPrice, maxPrice, minYear, maxYear])

  // Filtrer les véhicules en fonction des critères
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((vehicle) => {
      // Recherche par mot-clé
      const matchesKeyword =
        searchTerm === "" ||
        Object.entries(vehicle).some(([key, value]) => {
          if (typeof value === "string" || typeof value === "number") {
            return String(value).toLowerCase().includes(searchTerm.toLowerCase())
          }
          return false
        })

      // Filtre par statut de contact
      const matchesContactStatus =
        contactStatusFilter === "all" ||
        (contactStatusFilter === "contacted" && vehicle.contact_status === "contacted") ||
        (contactStatusFilter === "not_contacted" && vehicle.contact_status !== "contacted")

      // Filtre par type de vendeur
      const matchesSellerType = sellerTypeFilter === "all" || vehicle.seller_type === sellerTypeFilter

      // Filtre par plage de prix
      const matchesPrice = !vehicle.price || (vehicle.price >= priceRange[0] && vehicle.price <= priceRange[1])

      // Filtre par année
      const matchesYear = !vehicle.year || (vehicle.year >= yearRange[0] && vehicle.year <= yearRange[1])

      return matchesKeyword && matchesContactStatus && matchesSellerType && matchesPrice && matchesYear
    })
  }, [vehicles, searchTerm, contactStatusFilter, sellerTypeFilter, priceRange, yearRange])

  // Filtrer les véhicules pour n'inclure que ceux avec des numéros de téléphone
  const vehiclesWithPhone = useMemo(() => {
    return showOnlyWithPhone ? filteredVehicles.filter((vehicle) => vehicle.phone) : filteredVehicles
  }, [showOnlyWithPhone, filteredVehicles])

  // Trier les véhicules
  const sortedVehicles = useMemo(() => {
    return [...vehiclesWithPhone].sort((a, b) => {
      switch (sortBy) {
        case "price_asc":
          return (a.price || 0) - (b.price || 0)
        case "price_desc":
          return (b.price || 0) - (a.price || 0)
        case "year_desc":
          return (b.year || 0) - (a.year || 0)
        case "year_asc":
          return (a.year || 0) - (b.year || 0)
        case "brand_asc":
          return (a.brand || "").localeCompare(b.brand || "")
        default:
          return 0
      }
    })
  }, [vehiclesWithPhone, sortBy])

  // Apply pagination to sorted vehicles
  const paginatedVehicles = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return sortedVehicles.slice(startIndex, endIndex)
  }, [sortedVehicles, currentPage, itemsPerPage])

  const toggleVehicleSelection = (id: string) => {
    if (selectedVehicleIds.includes(id)) {
      setSelectedVehicleIds(selectedVehicleIds.filter((vehicleId) => vehicleId !== id))
    } else {
      setSelectedVehicleIds([...selectedVehicleIds, id])
    }
  }

  const selectAllVehicles = () => {
    if (selectedVehicleIds.length === vehiclesWithPhone.length) {
      setSelectedVehicleIds([])
    } else {
      setSelectedVehicleIds(vehiclesWithPhone.map((vehicle) => vehicle.id))
    }
  }

  const confirmSelection = () => {
    const selected = vehicles.filter((vehicle) => selectedVehicleIds.includes(vehicle.id))
    onVehiclesSelected(selected)
  }

  const resetFilters = () => {
    setSearchTerm("")
    setContactStatusFilter("all")
    setSellerTypeFilter("all")
    setPriceRange([minPrice, maxPrice])
    setYearRange([minYear, maxYear])
    setSortBy("default")
  }

  // Compter le nombre de filtres actifs
  const activeFiltersCount = [
    contactStatusFilter !== "all",
    sellerTypeFilter !== "all",
    priceRange[0] > minPrice || priceRange[1] < maxPrice,
    yearRange[0] > minYear || yearRange[1] < maxYear,
  ].filter(Boolean).length

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
          <Select value={sortBy} onValueChange={setSortBy}>
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

      {/* Barre de recherche */}
      <div className="px-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par marque, modèle, localisation..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 h-10"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8"
              onClick={() => setSearchTerm("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
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
                    variant={contactStatusFilter === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setContactStatusFilter("all")}
                    className="h-8 text-xs"
                  >
                    Tous
                  </Button>
                  <Button
                    variant={contactStatusFilter === "contacted" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setContactStatusFilter("contacted")}
                    className="h-8 text-xs"
                  >
                    <MessageCircle className="h-3.5 w-3.5 mr-1" />
                    Contactés
                  </Button>
                  <Button
                    variant={contactStatusFilter === "not_contacted" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setContactStatusFilter("not_contacted")}
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
                    variant={sellerTypeFilter === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSellerTypeFilter("all")}
                    className="h-8 text-xs"
                  >
                    Tous
                  </Button>
                  <Button
                    variant={sellerTypeFilter === "particulier" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSellerTypeFilter("particulier")}
                    className="h-8 text-xs"
                  >
                    <Phone className="h-3.5 w-3.5 mr-1" />
                    Particulier
                  </Button>
                  <Button
                    variant={sellerTypeFilter === "professionnel" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSellerTypeFilter("professionnel")}
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
                    variant={showOnlyWithPhone ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowOnlyWithPhone(true)}
                    className="h-8 text-xs"
                  >
                    <Phone className="h-3.5 w-3.5 mr-1" />
                    Avec téléphone
                  </Button>
                  <Button
                    variant={!showOnlyWithPhone ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowOnlyWithPhone(false)}
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
                    value={priceRange[0]}
                    onChange={(e) => setPriceRange([Number.parseInt(e.target.value) || 0, priceRange[1]])}
                    className="h-8 text-xs"
                  />
                  <span className="text-xs">à</span>
                  <Input
                    type="number"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], Number.parseInt(e.target.value) || 0])}
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
                    value={yearRange[0]}
                    onChange={(e) => setYearRange([Number.parseInt(e.target.value) || 0, yearRange[1]])}
                    className="h-8 text-xs"
                  />
                  <span className="text-xs">à</span>
                  <Input
                    type="number"
                    value={yearRange[1]}
                    onChange={(e) => setYearRange([yearRange[0], Number.parseInt(e.target.value) || 0])}
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
              checked={selectedVehicleIds.length > 0 && selectedVehicleIds.length === vehiclesWithPhone.length}
              onCheckedChange={selectAllVehicles}
            />
            <label htmlFor="select-all" className="text-sm">
              Sélectionner tout ({selectedVehicleIds.length}/{vehiclesWithPhone.length})
            </label>
          </div>
          <Button
            size="sm"
            onClick={confirmSelection}
            disabled={selectedVehicleIds.length === 0}
            className="h-9 bg-[#25D366] hover:bg-[#128C7E] text-white"
          >
            <CheckSquare className="h-4 w-4 mr-2" />
            Utiliser la sélection
          </Button>
        </div>

        {loadingVehicles ? (
          <div className="flex items-center justify-center h-[500px]">
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 rounded-full border-2 border-[#25D366] border-t-transparent animate-spin"></div>
              <p className="text-sm text-muted-foreground">Chargement des véhicules...</p>
            </div>
          </div>
        ) : sortedVehicles.length > 0 ? (
          <FixedSizeGrid
            columnCount={2} // For your 2-column grid
            columnWidth={300} // Adjust based on your card width
            height={500} // Match ScrollArea height
            rowCount={Math.ceil(sortedVehicles.length / 2)}
            rowHeight={200} // Adjust based on your card height
            width={620} // Adjust based on your container width (2 * columnWidth + gap)
            className="grid-container" // Add a class for potential styling
          >
            {({ columnIndex, rowIndex, style }) => {
              const index = rowIndex * 2 + columnIndex
              if (index >= sortedVehicles.length) return null

              const vehicle = sortedVehicles[index]
              return (
                <div style={style} className="p-1.5"> {/* Adjust padding as needed */}
                  <div
                    key={vehicle.id}
                    className={cn(
                      "flex flex-col rounded-md border transition-colors h-full", // Ensure card takes full height
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
                </div>
              )
            }}
          </FixedSizeGrid>
        ) : (
          <div className="flex flex-col items-center justify-center h-[500px] py-10 text-center">
            <Car className="h-12 w-12 text-muted-foreground opacity-20 mb-3" />
            <p className="text-muted-foreground">
              {filteredVehicles.length > 0
                ? "Aucun véhicule avec numéro de téléphone trouvé"
                : "Aucun véhicule trouvé"}
            </p>
            {activeFiltersCount > 0 && (
              <Button variant="link" size="sm" onClick={resetFilters} className="mt-2">
                Réinitialiser les filtres
              </Button>
            )}
          </div>
        )}

        {/* Pagination Controls */}
        {sortedVehicles.length > itemsPerPage && (
          <div className="flex justify-between items-center p-4 border-t mt-4">
            <div className="text-sm text-muted-foreground">
              Affichage {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, sortedVehicles.length)} sur {sortedVehicles.length}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Précédent
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => p + 1)}
                disabled={currentPage * itemsPerPage >= sortedVehicles.length}
              >
                Suivant
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
