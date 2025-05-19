"use client"

import type React from "react"
import { Car, Calendar, Gauge, MapPin, Fuel, Euro, ExternalLink, Info } from "lucide-react"
import type { Database } from "@/types/supabase" // Assuming global Supabase types

type Vehicle = Database["public"]["Tables"]["vehicles"]["Row"]

interface VehicleDetailsProps {
  vehicle: Vehicle | null | undefined
  layout?: "compact" | "full" // To control verbosity if needed
  className?: string
}

// Helper to format phone number
const formatPhoneNumber = (phoneNumber: string | null | undefined) => {
  if (!phoneNumber) return ""
  return phoneNumber.replace("@c.us", "")
}

const VehicleDetails: React.FC<VehicleDetailsProps> = ({ vehicle, layout = "full", className = "" }) => {
  if (!vehicle) {
    if (layout === "compact") return null // Don't show anything if no vehicle in compact mode
    return (
      <div className={`text-xs text-red-500 mt-1 ${className}`}>
        <Info className="h-3 w-3 inline-block mr-1" />
        Aucun véhicule associé
      </div>
    )
  }

  if (layout === "compact") {
    return (
      <div className={`mt-2 ${className}`}>
        {vehicle.image_url && (
          <div className="mb-2 relative float-right ml-2">
            <img
              src={vehicle.image_url}
              alt={`${vehicle.brand} ${vehicle.model}`}
              className="w-16 h-16 object-cover rounded-md"
              onError={(e) => {
                // Replace broken image with a placeholder
                (e.target as HTMLImageElement).src = "https://placehold.co/64x64/gray/white?text=No+Image";
              }}
            />
            <div className="absolute bottom-0 right-0 bg-black bg-opacity-70 text-white px-1 py-0.5 text-xs rounded-tl-md">
              <Euro className="h-3 w-3 inline-block mr-0.5" />
              {vehicle.price?.toLocaleString()} € {/* Add optional chaining */}
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-1 text-xs">
          {vehicle.brand && vehicle.model && ( // Add conditional rendering
            <div className="text-green-600 flex items-center">
              <Car className="h-3 w-3 mr-1" />
              {vehicle.brand} {vehicle.model}
            </div>
          )}
          {vehicle.year && ( // Add conditional rendering
            <div className="text-slate-600 flex items-center">
              <Calendar className="h-3 w-3 mr-1" />
              {vehicle.year}
            </div>
          )}
          {vehicle.mileage != null && ( // Check for null or undefined
            <div className="flex items-center">
              <Gauge className="h-3 w-3 mr-1" />
              <span>{vehicle.mileage.toLocaleString()} km</span>
            </div>
          )}
          {vehicle.fuel_type && ( // Add conditional rendering
            <div className="flex items-center">
              <Fuel className="h-3 w-3 mr-1" />
              <span>{vehicle.fuel_type}</span>
            </div>
          )}
          {vehicle.location && ( // Add conditional rendering
            <div className="flex items-center col-span-2 truncate">
              <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
              <span className="truncate">{vehicle.location}</span>
            </div>
          )}
        </div>
        {vehicle.listing_url && (
          <a
            href={vehicle.listing_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-700 text-xs flex items-center mt-1"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Voir l'annonce
          </a>
        )}
      </div>
    )
  }

  // Full layout (default)
  return (
    <div className={`mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 ${className}`}>
      <div className="flex items-center mb-2">
        {vehicle.image_url && (
          <img
            src={vehicle.image_url}
            alt={`${vehicle.brand} ${vehicle.model}`}
            className="w-12 h-12 object-cover rounded-md mr-3"
          />
        )}
        <div>
          {vehicle.brand && vehicle.model && ( // Add conditional rendering
            <h4 className="font-medium text-sm">
              {vehicle.brand} {vehicle.model}
            </h4>
          )}
          {vehicle.price != null && ( // Check for null or undefined
            <div className="text-sm font-semibold text-green-600">
              <Euro className="h-4 w-4 inline-block mr-1" />
              {vehicle.price.toLocaleString()} €
            </div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-xs">
        {vehicle.year && ( // Add conditional rendering
          <div className="flex items-center">
            <Calendar className="h-3 w-3 mr-1.5 text-slate-500" />
            <span>{vehicle.year}</span>
          </div>
        )}
        {vehicle.mileage != null && ( // Check for null or undefined
          <div className="flex items-center">
            <Gauge className="h-3 w-3 mr-1.5 text-slate-500" />
            <span>{vehicle.mileage.toLocaleString()} km</span>
          </div>
        )}
        {vehicle.fuel_type && ( // Add conditional rendering
          <div className="flex items-center">
            <Fuel className="h-3 w-3 mr-1.5 text-slate-500" />
            <span>{vehicle.fuel_type}</span>
          </div>
        )}
        {vehicle.transmission && ( // Add conditional rendering
          <div className="flex items-center">
            <Car className="h-3 w-3 mr-1.5 text-slate-500" /> {/* Assuming transmission is relevant */}
            <span>{vehicle.transmission}</span>
          </div>
        )}
        {vehicle.location && ( // Add conditional rendering
          <div className="flex items-center col-span-2 md:col-span-4">
            <MapPin className="h-3 w-3 mr-1.5 text-slate-500 flex-shrink-0" />
            <span className="truncate">{vehicle.location}</span>
          </div>
        )}
        {vehicle.phone && (
          <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 col-span-2 md:col-span-4">
            <Info className="h-3 w-3 mr-1" /> {/* Using Info icon for phone */}
            <span>Vendeur: {formatPhoneNumber(vehicle.phone)}</span>
          </div>
        )}
      </div>
      {vehicle.listing_url && (
        <a
          href={vehicle.listing_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:text-blue-700 text-xs flex items-center mt-2"
        >
          <ExternalLink className="h-3 w-3 mr-1" />
          Voir l'annonce originale
        </a>
      )}
    </div>
  )
}

export default VehicleDetails
