export interface Vehicle {
  marque: string
  modele: string
  prix: string
  annee: string
  kilometrage: string
  carburant?: string
  transmission?: string
  puissance?: string
  localisation?: string
  url: string
  telephone?: string
  image_url?: string
}

export function formatPhoneNumber(phone: string): string {
  if (!phone) return ""

  // Remove all non-numeric characters
  let cleaned = phone.replace(/\D/g, "")

  // Remove initial 0 if present after country code
  if (cleaned.startsWith("32") && cleaned.length > 2 && cleaned.charAt(2) === "0") {
    cleaned = "32" + cleaned.substring(3)
  }

  // If number doesn't start with country code, add 32 (Belgium)
  if (!cleaned.startsWith("32") && cleaned.startsWith("0")) {
    cleaned = "32" + cleaned.substring(1)
  }

  return cleaned
}

export function formatVehicleForDatabase(vehicle: Vehicle) {
  return {
    brand: vehicle.marque,
    model: vehicle.modele,
    price: Number.parseFloat(vehicle.prix.replace(/[^\d]/g, "").replace(/(\d+)1,\s*5$/, "$1")),
    year: vehicle.annee ? Number.parseInt(vehicle.annee) : new Date().getFullYear(),
    mileage: Number.parseInt(vehicle.kilometrage.replace(/[^\d]/g, "")),
    fuel_type: vehicle.carburant || "",
    transmission: vehicle.transmission || "",
    power: vehicle.puissance ? Number.parseInt(vehicle.puissance) : null,
    location: vehicle.localisation || "",
    listing_url: vehicle.url,
    phone: formatPhoneNumber(vehicle.telephone || ""),
    image_url: vehicle.image_url || "",
    contact_status: "not_contacted",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

export function downloadCSV(results: Vehicle[]) {
  if (results.length === 0) return

  const headers = Object.keys(results[0])
  const csvContent = [
    headers.join(","),
    ...results.map((row) =>
      headers
        .map((header) => {
          let value = row[header as keyof Vehicle] || ""
          // Escape quotes and wrap in quotes if contains comma
          value = String(value).replace(/"/g, '""')
          if (value.includes(",") || value.includes('"') || value.includes("\n")) {
            value = `"${value}"`
          }
          return value
        })
        .join(","),
    ),
  ].join("\n")

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute("download", "autoscout_results.csv")
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function downloadLogs(logs: string[]) {
  if (logs.length === 0) return

  const logsContent = logs.join("\n")
  const blob = new Blob([logsContent], { type: "text/plain;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute("download", "autoscout_logs.txt")
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function saveVehiclesToDatabase(results: Vehicle[]) {
  if (results.length === 0) return Promise.resolve({ savedCount: 0 })

  const formattedVehicles = results.map(formatVehicleForDatabase)

  return fetch("/api/autoscout/vehicles", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ vehicles: formattedVehicles }),
  }).then((response) => {
    if (!response.ok) {
      throw new Error("Erreur lors de l'enregistrement")
    }
    return response.json()
  })
}
