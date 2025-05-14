import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { Car, MapPin, Banknote, Gauge, Fuel, Phone, MessageCircle, Building } from "lucide-react"
import { useVehicles } from "@/hooks/useVehicles"
import { Vehicle } from "../types/vehicles"

interface VehicleSelectorProps {
  onVehiclesSelected: (vehicles: Vehicle[]) => void
}

export default function VehicleSelector({ onVehiclesSelected }: VehicleSelectorProps) {
  const { vehicles, loading: loadingVehicles } = useVehicles()
  
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [contactStatusFilter, setContactStatusFilter] = useState<"all" | "contacted" | "not_contacted">("all")
  const [sellerTypeFilter, setSellerTypeFilter] = useState<"all" | "particulier" | "professionnel">("all")

  // Filter vehicles based on search term, contact status, and seller type
  const filteredVehicles = vehicles.filter(
    (vehicle) => {
      // Keyword search across multiple fields
      const matchesKeyword = searchTerm === "" || 
        Object.entries(vehicle).some(([key, value]) => {
          // Only search string and number fields
          if (typeof value === 'string' || typeof value === 'number') {
            return String(value).toLowerCase().includes(searchTerm.toLowerCase())
          }
          return false
        });

      const matchesContactStatus = 
        contactStatusFilter === "all" || 
        (contactStatusFilter === "contacted" && vehicle.contact_status === "contacted") ||
        (contactStatusFilter === "not_contacted" && vehicle.contact_status !== "contacted");

      const matchesSellerType = 
        sellerTypeFilter === "all" || 
        vehicle.seller_type === sellerTypeFilter;

      return matchesKeyword && matchesContactStatus && matchesSellerType;
    }
  )

  // Filter vehicles to only include those with phone numbers
  const vehiclesWithPhone = filteredVehicles.filter(vehicle => vehicle.phone)

  const toggleVehicleSelection = (id: string) => {
    if (selectedVehicles.includes(id)) {
      setSelectedVehicles(selectedVehicles.filter((vehicleId) => vehicleId !== id))
    } else {
      setSelectedVehicles([...selectedVehicles, id])
    }
  }

  const selectAllVehicles = () => {
    if (selectedVehicles.length === vehiclesWithPhone.length) {
      setSelectedVehicles([])
    } else {
      setSelectedVehicles(vehiclesWithPhone.map((vehicle) => vehicle.id))
    }
  }

  const confirmSelection = () => {
    const selected = vehicles.filter((vehicle) => selectedVehicles.includes(vehicle.id))
    onVehiclesSelected(selected)
  }

  return (
    <Card className="shadow-md border-0">
      <CardHeader className="bg-slate-50 dark:bg-slate-800 rounded-t-lg pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Car className="h-5 w-5 text-[#25D366]" />
            <CardTitle className="text-lg">Sélection des véhicules</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="mb-4 flex flex-col space-y-2">
          <Input
            placeholder="Rechercher un véhicule..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9 text-sm"
          />
          <div className="flex space-x-2 flex-wrap">
            <div className="flex space-x-2">
              <Button 
                variant={contactStatusFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setContactStatusFilter("all")}
                className="h-9"
              >
                Tous
              </Button>
              <Button 
                variant={contactStatusFilter === "contacted" ? "default" : "outline"}
                size="sm"
                onClick={() => setContactStatusFilter("contacted")}
                className="h-9"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Contactés
              </Button>
              <Button 
                variant={contactStatusFilter === "not_contacted" ? "default" : "outline"}
                size="sm"
                onClick={() => setContactStatusFilter("not_contacted")}
                className="h-9"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Non contactés
              </Button>
            </div>
            <div className="flex space-x-2">
              <Button 
                variant={sellerTypeFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSellerTypeFilter("all")}
                className="h-9"
              >
                Tous
              </Button>
              <Button 
                variant={sellerTypeFilter === "particulier" ? "default" : "outline"}
                size="sm"
                onClick={() => setSellerTypeFilter("particulier")}
                className="h-9"
              >
                <Phone className="h-4 w-4 mr-2" />
                Particulier
              </Button>
              <Button 
                variant={sellerTypeFilter === "professionnel" ? "default" : "outline"}
                size="sm"
                onClick={() => setSellerTypeFilter("professionnel")}
                className="h-9"
              >
                <Building className="h-4 w-4 mr-2" />
                Professionnel
              </Button>
            </div>
          </div>
        </div>

        <Tabs defaultValue="all">
          <TabsList className="mb-2 h-8">
            <TabsTrigger value="all" className="text-xs h-7">
              Tous
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="m-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all"
                  checked={selectedVehicles.length > 0 && selectedVehicles.length === vehiclesWithPhone.length}
                  onCheckedChange={selectAllVehicles}
                />
                <label htmlFor="select-all" className="text-xs font-medium">
                  Sélectionner tout ({selectedVehicles.length}/{vehiclesWithPhone.length})
                </label>
              </div>
              <Button
                size="sm"
                onClick={confirmSelection}
                disabled={selectedVehicles.length === 0}
                className="h-7 text-xs bg-[#25D366] hover:bg-[#128C7E] text-white"
              >
                Utiliser la sélection
              </Button>
            </div>

            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {loadingVehicles ? (
                  <div className="text-center py-8 text-muted-foreground">Chargement des véhicules...</div>
                ) : vehiclesWithPhone.length > 0 ? (
                  vehiclesWithPhone.map((vehicle) => (
                    <div
                      key={vehicle.id}
                      className={`flex flex-col p-3 rounded-md border border-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 
                        ${vehicle.contact_status === 'contacted' ? 'opacity-60' : ''}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            id={`vehicle-${vehicle.id}`}
                            checked={selectedVehicles.includes(vehicle.id)}
                            onCheckedChange={() => toggleVehicleSelection(vehicle.id)}
                            className="mt-1"
                          />
                          {vehicle.image_url && (
                            <div className="flex-shrink-0 h-16 w-16 rounded-md overflow-hidden">
                              <img 
                                src={vehicle.image_url} 
                                alt={`${vehicle.brand || 'N/A'} ${vehicle.model || 'N/A'}`} 
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  // Replace broken image with placeholder
                                  (e.target as HTMLImageElement).src = "https://placehold.co/64x64/gray/white?text=No+Image";
                                }}
                              />
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-sm">
                              {vehicle.brand || 'N/A'} {vehicle.model || 'N/A'} {vehicle.year ? `(${vehicle.year})` : ''}
                            </div>
                            <div className="flex flex-wrap gap-2 mt-1">
                              <Badge variant="outline" className="text-xs flex items-center gap-1">
                                <Banknote className="h-3 w-3" />
                                {vehicle.price ? vehicle.price.toLocaleString('fr-FR') : 'N/A'} €
                              </Badge>
                              <Badge variant="outline" className="text-xs flex items-center gap-1">
                                <Gauge className="h-3 w-3" />
                                {vehicle.mileage ? vehicle.mileage.toLocaleString('fr-FR') : 'N/A'} km
                              </Badge>
                              <Badge variant="outline" className="text-xs flex items-center gap-1">
                                <Fuel className="h-3 w-3" />
                                {vehicle.fuel_type || 'N/A'}
                              </Badge>
                              <Badge variant="outline" className="text-xs flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {vehicle.location || 'N/A'}
                              </Badge>
                              {vehicle.phone && (
                                <Badge variant="outline" className="text-xs flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {vehicle.phone}
                                </Badge>
                              )}
                              {vehicle.contact_status === 'contacted' && (
                                <Badge variant="outline" className="text-xs flex items-center gap-1 text-green-600 border-green-600">
                                  <MessageCircle className="h-3 w-3" />
                                  Contacté
                                </Badge>
                              )}
                              {vehicle.listing_url && (
                                <Badge variant="outline" className="text-xs flex items-center gap-1">
                                  <a href={vehicle.listing_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:underline">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                                    </svg>
                                    Annonce
                                  </a>
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {filteredVehicles.length > 0 
                      ? "Aucun véhicule avec numéro de téléphone trouvé" 
                      : "Aucun véhicule trouvé"}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
