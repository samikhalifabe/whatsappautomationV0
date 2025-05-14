"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Car, MessageSquare, Phone, MapPin, Banknote, Gauge, Fuel } from "lucide-react"
import { useVehicles } from "@/hooks/useVehicles"
import { useContacts } from "@/hooks/useContacts"
import { useContactHistory } from "@/hooks/useContactHistory"
import VehicleConversation from "./VehicleConversation"
import { Vehicle } from "../types/vehicles"

// Temporary user ID until authentication is implemented
const TEMP_USER_ID = "00000000-0000-0000-0000-000000000000"

export default function VehicleManager() {
  const { vehicles, loading: loadingVehicles } = useVehicles()
  const { fetchContactHistoryByRecordId } = useContactHistory()
  
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [contactDialogOpen, setContactDialogOpen] = useState(false)

  // Filter vehicles based on search term
  const filteredVehicles = vehicles.filter(
    (vehicle) =>
      vehicle.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (vehicle.phone && vehicle.phone.includes(searchTerm))
  )

  const toggleVehicleSelection = (id: string) => {
    if (selectedVehicles.includes(id)) {
      setSelectedVehicles(selectedVehicles.filter((vehicleId) => vehicleId !== id))
    } else {
      setSelectedVehicles([...selectedVehicles, id])
    }
  }

  const selectAllVehicles = () => {
    if (selectedVehicles.length === vehicles.length) {
      setSelectedVehicles([])
    } else {
      setSelectedVehicles(vehicles.map((vehicle) => vehicle.id))
    }
  }

  const openContactDialog = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle)
    setContactDialogOpen(true)
  }

  return (
    <Card className="shadow-md border-0">
      <CardHeader className="bg-slate-50 dark:bg-slate-800 rounded-t-lg pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Car className="h-5 w-5 text-[#25D366]" />
            <CardTitle className="text-lg">Gestion des véhicules</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="mb-4">
          <Input
            placeholder="Rechercher un véhicule..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9 text-sm"
          />
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
                  checked={selectedVehicles.length > 0 && selectedVehicles.length === vehicles.length}
                  onCheckedChange={selectAllVehicles}
                />
                <label htmlFor="select-all" className="text-xs font-medium">
                  Sélectionner tout ({selectedVehicles.length}/{vehicles.length})
                </label>
              </div>
            </div>

            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {loadingVehicles ? (
                  <div className="text-center py-8 text-muted-foreground">Chargement des véhicules...</div>
                ) : filteredVehicles.length > 0 ? (
                  filteredVehicles.map((vehicle) => (
                    <div
                      key={vehicle.id}
                      className="flex flex-col p-3 rounded-md border border-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
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
                                alt={`${vehicle.brand} ${vehicle.model}`} 
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
                              {vehicle.brand} {vehicle.model} ({vehicle.year})
                            </div>
                            <div className="flex flex-wrap gap-2 mt-1">
                              <Badge variant="outline" className="text-xs flex items-center gap-1">
                                <Banknote className="h-3 w-3" />
                                {vehicle.price.toLocaleString('fr-FR')} €
                              </Badge>
                              <Badge variant="outline" className="text-xs flex items-center gap-1">
                                <Gauge className="h-3 w-3" />
                                {vehicle.mileage.toLocaleString('fr-FR')} km
                              </Badge>
                              <Badge variant="outline" className="text-xs flex items-center gap-1">
                                <Fuel className="h-3 w-3" />
                                {vehicle.fuel_type}
                              </Badge>
                              <Badge variant="outline" className="text-xs flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {vehicle.location}
                              </Badge>
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
                        <div className="flex items-center gap-2">
                          {vehicle.phone && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openContactDialog(vehicle)}
                              className="h-8 text-xs"
                            >
                              <MessageSquare className="h-3.5 w-3.5 mr-1" />
                              Contacter
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">Aucun véhicule trouvé</div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Contact Dialog */}
        <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {selectedVehicle && (
                  <div className="flex items-center justify-between">
                    <span>
                      {selectedVehicle.brand} {selectedVehicle.model} ({selectedVehicle.year})
                    </span>
                    <Badge variant="outline" className="text-xs flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {selectedVehicle.phone}
                    </Badge>
                  </div>
                )}
              </DialogTitle>
            </DialogHeader>

            {selectedVehicle && (
              <VehicleConversation 
                vehicle={selectedVehicle} 
                onMessageSent={() => {
                  // Optionally refresh data after message sent
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
