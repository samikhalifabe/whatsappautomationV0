"use client"

import { useState, useEffect, useCallback } from "react"

interface ScraperState {
  url: string
  isRunning: boolean
  progress: number
  logs: string[]
  results: any[]
  error: string | null
  success: string | null
  multiPage: boolean
}

export function useAutoScoutScraper() {
  const [state, setState] = useState<ScraperState>({
    url: "",
    isRunning: false,
    progress: 0,
    logs: [],
    results: [],
    error: null,
    success: null,
    multiPage: false,
  })

  const [eventSource, setEventSource] = useState<EventSource | null>(null)

  const startScraping = useCallback(async () => {
    if (!state.url) {
      setState((prev) => ({ ...prev, error: "Veuillez entrer une URL valide" }))
      return
    }

    try {
      // Reset state
      setState((prev) => ({
        ...prev,
        isRunning: true,
        progress: 0,
        logs: [],
        results: [],
        error: null,
        success: null,
      }))

      // Close existing event source
      if (eventSource) {
        eventSource.close()
      }

      // Create new event source
      const newEventSource = new EventSource(
        `/api/autoscout/scrape?url=${encodeURIComponent(state.url)}&multiPage=${state.multiPage}`,
      )
      setEventSource(newEventSource)

      newEventSource.onmessage = (event) => {
        const data = JSON.parse(event.data)

        switch (data.type) {
          case "log":
            setState((prev) => ({ ...prev, logs: [...prev.logs, data.message] }))
            break
          case "progress":
            setState((prev) => ({ ...prev, progress: data.value }))
            break
          case "result":
            setState((prev) => ({ ...prev, results: data.vehicles }))
            break
          case "error":
            setState((prev) => ({
              ...prev,
              error: data.message,
              isRunning: false,
            }))
            newEventSource.close()
            break
          case "complete":
            setState((prev) => ({
              ...prev,
              success: "Extraction terminée avec succès!",
              isRunning: false,
            }))
            newEventSource.close()
            break
        }
      }

      newEventSource.onerror = () => {
        setState((prev) => ({
          ...prev,
          error: "Erreur de connexion au serveur",
          isRunning: false,
        }))
        newEventSource.close()
      }
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: "Une erreur est survenue lors du démarrage de l'extraction",
        isRunning: false,
      }))
    }
  }, [state.url, state.multiPage, eventSource])

  const stopScraping = useCallback(async () => {
    if (eventSource) {
      eventSource.close()
      setEventSource(null)
    }

    try {
      await fetch("/api/autoscout/stop", { method: "POST" })
      setState((prev) => ({
        ...prev,
        logs: [...prev.logs, "Extraction arrêtée manuellement"],
        isRunning: false,
      }))
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: "Erreur lors de l'arrêt de l'extraction",
      }))
    }
  }, [eventSource])

  const setUrl = useCallback((newUrl: string) => {
    setState((prev) => ({ ...prev, url: newUrl }))
  }, [])

  const setMultiPage = useCallback((multiPage: boolean) => {
    setState((prev) => ({ ...prev, multiPage }))
  }, [])

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (eventSource) {
        eventSource.close()
      }
    }
  }, [eventSource])

  return {
    ...state,
    startScraping,
    stopScraping,
    setUrl,
    setMultiPage,
    eventSource,
  }
}
