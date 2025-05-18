"use client"

import { useState, useEffect, useCallback } from "react"
import type { SendStatus } from "@/types/message"
import type { Database } from "@/types/supabase"
import axios from "axios"
import { useWhatsApp } from "@/components/WhatsAppContext"

type Vehicle = Database["public"]["Tables"]["vehicles"]["Row"]

const TEMP_USER_ID = "00000000-0000-0000-0000-000000000000" // Temporary user ID

const BASE_URL = "http://localhost:3001/api/whatsapp"

export function useMultiSender() {
  const { status, refreshStatus, lastChecked } = useWhatsApp()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [message, setMessage] = useState("")
  const [sendStatus, setSendStatus] = useState<SendStatus[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Paramètres anti-spam
  const [minDelay, setMinDelay] = useState(5)
  const [maxDelay, setMaxDelay] = useState(15)
  const [maxPerHour, setMaxPerHour] = useState(30)
  const [randomizeOrder, setRandomizeOrder] = useState(true)
  const [avoidDuplicates, setAvoidDuplicates] = useState(true)

  // Vérifier le statut au chargement du hook
  useEffect(() => {
    const checkStatus = async () => {
      await refreshStatus()
    }
    checkStatus()
  }, []) // Tableau de dépendances vide = exécution unique au montage

  const handleRefreshStatus = useCallback(async () => {
    setIsRefreshing(true)
    await refreshStatus()
    setIsRefreshing(false)
  }, [refreshStatus])

  const handleVehiclesSelected = useCallback((selectedVehicles: Vehicle[]) => {
    const vehiclesWithPhone = selectedVehicles.filter((vehicle) => vehicle.phone)
    setVehicles(vehiclesWithPhone)
  }, [])

  const handleTemplateSelected = useCallback((templateContent: string) => {
    let template = templateContent
    template = template.replace(/{{[ ]*(\w+)[ ]*}}/g, "___") // Replace variables for preview
    setMessage(template)
  }, [])

  const updateSendStatus = useCallback((contactId: string, newStatus: Partial<SendStatus>) => {
    setSendStatus((prev) =>
      prev.map((status) => (status.contactId === contactId ? { ...status, ...newStatus } : status)),
    )
  }, [])

  const processVehicle = useCallback(
    async (vehicle: Vehicle, personalizedMessage: string) => {
      if (!vehicle.phone) {
        return { success: false, error: "No phone number" }
      }

      // Add to the list of statuses
      setSendStatus((prev) => [
        ...prev,
        {
          contactId: vehicle.id,
          contactName: `${vehicle.brand} ${vehicle.model}`,
          contactNumber: vehicle.phone || "",
          status: "pending",
          timestamp: new Date(),
        },
      ])

      try {
        console.log(`Envoi du message pour ${vehicle.brand} ${vehicle.model} (${vehicle.phone})...`)

        // Option 1: Utiliser l'API directement
        const { data } = await axios.post(`${BASE_URL}/send`, {
          number: vehicle.phone,
          message: personalizedMessage,
        })

        // Option 2: Utiliser le service de messagerie (décommentez pour utiliser)
        // const result = await sendWhatsAppMessage(
        //   vehicle.phone || "",
        //   personalizedMessage,
        //   vehicle,
        //   TEMP_USER_ID
        // )
        // const data = { messageId: result.messageId || "unknown" }

        console.log("Réponse du serveur:", data)

        updateSendStatus(vehicle.id, { status: "success", messageId: data.messageId })
        return { success: true }
      } catch (error: any) {
        console.error("Erreur lors de l'envoi:", error)
        updateSendStatus(vehicle.id, {
          status: "error",
          error: error.response?.data?.error || "Erreur d'envoi",
        })
        return { success: false, error: error.response?.data?.error || "Erreur d'envoi" }
      }
    },
    [updateSendStatus],
  )

  const sendMessages = useCallback(async () => {
    if (vehicles.length === 0 || !message) {
      setResult({
        success: false,
        message: "Veuillez sélectionner des véhicules et saisir un message",
      })
      return
    }

    await refreshStatus()

    if (status !== "connected") {
      setResult({
        success: false,
        message: "WhatsApp n'est pas connecté. Veuillez scanner le QR code dans l'onglet 'Envoi simple'.",
      })
      return
    }

    setIsProcessing(true)
    setProgress(0)
    setSendStatus([])
    setResult(null)

    let vehiclesToProcess = [...vehicles]

    if (randomizeOrder) {
      vehiclesToProcess = vehiclesToProcess.sort(() => Math.random() - 0.5)
    }

    if (vehiclesToProcess.length > maxPerHour) {
      setResult({
        success: false,
        message: `Trop de véhicules sélectionnés. Maximum: ${maxPerHour} par heure.`,
      })
      setIsProcessing(false)
      return
    }

    let successCount = 0
    let failCount = 0
    let lastMessage = ""

    for (let i = 0; i < vehiclesToProcess.length; i++) {
      const vehicle = vehiclesToProcess[i]

      let personalizedMessage = message
      personalizedMessage = personalizedMessage.replace(/{{[ ]*marque[ ]*}}/g, vehicle.brand)
      personalizedMessage = personalizedMessage.replace(/{{[ ]*modele[ ]*}}/g, vehicle.model)
      personalizedMessage = personalizedMessage.replace(/{{[ ]*prix[ ]*}}/g, vehicle.price?.toString() || "")
      personalizedMessage = personalizedMessage.replace(/{{[ ]*annee[ ]*}}/g, vehicle.year?.toString() || "")
      personalizedMessage = personalizedMessage.replace(/{{[ ]*kilometrage[ ]*}}/g, vehicle.mileage?.toString() || "")
      personalizedMessage = personalizedMessage.replace(/{{[ ]*url[ ]*}}/g, vehicle.listing_url || "")

      if (avoidDuplicates && personalizedMessage === lastMessage) {
        personalizedMessage += " "
      }

      lastMessage = personalizedMessage

      const result = await processVehicle(vehicle, personalizedMessage)

      if (result.success) {
        successCount++
      } else {
        failCount++
      }

      setProgress(Math.round(((i + 1) / vehiclesToProcess.length) * 100))

      if (i < vehiclesToProcess.length - 1) {
        const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1) + minDelay) * 1000
        console.log(`Attente de ${delay / 1000} secondes avant le prochain envoi...`)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }

    setProgress(100)
    setIsProcessing(false)
    setResult({
      success: successCount > 0,
      message: `Envoi terminé: ${successCount} message(s) envoyé(s), ${failCount} échec(s)`,
    })
  }, [
    vehicles,
    message,
    refreshStatus,
    status,
    randomizeOrder,
    maxPerHour,
    avoidDuplicates,
    minDelay,
    maxDelay,
    processVehicle,
  ])

  return {
    status,
    lastChecked,
    vehicles,
    message,
    setMessage,
    sendStatus,
    isProcessing,
    progress,
    result,
    isRefreshing,
    minDelay,
    setMinDelay,
    maxDelay,
    setMaxDelay,
    maxPerHour,
    setMaxPerHour,
    randomizeOrder,
    setRandomizeOrder,
    avoidDuplicates,
    setAvoidDuplicates,
    handleRefreshStatus,
    handleVehiclesSelected,
    handleTemplateSelected,
    sendMessages,
  }
}
