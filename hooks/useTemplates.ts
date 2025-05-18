"use client"

import { useState, useEffect } from "react"
import { templateService } from "@/services/templateService"
import type { MessageTemplate } from "@/types/message"
import { useToast } from "@/hooks/use-toast"

export function useTemplates() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // Charger les modèles au montage du composant
  useEffect(() => {
    fetchTemplates()
  }, [])

  // Récupérer tous les modèles
  const fetchTemplates = async () => {
    setLoading(true)
    try {
      const data = await templateService.getTemplates()
      setTemplates(data)
      setError(null)
    } catch (err) {
      setError("Erreur lors du chargement des modèles")
      toast({
        title: "Erreur",
        description: "Impossible de charger les modèles de messages",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Ajouter un nouveau modèle
  const addTemplate = async (template: Omit<MessageTemplate, "id">) => {
    try {
      const newTemplate = await templateService.addTemplate(template)
      if (newTemplate) {
        setTemplates([newTemplate, ...templates])
        toast({
          title: "Succès",
          description: "Modèle ajouté avec succès",
        })
        return true
      }
      return false
    } catch (err) {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le modèle",
        variant: "destructive",
      })
      return false
    }
  }

  // Mettre à jour un modèle existant
  const updateTemplate = async (template: MessageTemplate) => {
    try {
      const updatedTemplate = await templateService.updateTemplate(template)
      if (updatedTemplate) {
        setTemplates(templates.map((t) => (t.id === template.id ? updatedTemplate : t)))
        toast({
          title: "Succès",
          description: "Modèle mis à jour avec succès",
        })
        return true
      }
      return false
    } catch (err) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le modèle",
        variant: "destructive",
      })
      return false
    }
  }

  // Supprimer un modèle
  const deleteTemplate = async (id: string) => {
    try {
      const success = await templateService.deleteTemplate(id)
      if (success) {
        setTemplates(templates.filter((t) => t.id !== id))
        toast({
          title: "Succès",
          description: "Modèle supprimé avec succès",
        })
        return true
      }
      return false
    } catch (err) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le modèle",
        variant: "destructive",
      })
      return false
    }
  }

  // Mettre à jour le statut favori d'un modèle
  const toggleFavorite = async (id: string, favorite: boolean) => {
    try {
      const success = await templateService.toggleFavorite(id, favorite)
      if (success) {
        setTemplates(templates.map((t) => (t.id === id ? { ...t, favorite } : t)))
        return true
      }
      return false
    } catch (err) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut favori",
        variant: "destructive",
      })
      return false
    }
  }

  return {
    templates,
    loading,
    error,
    fetchTemplates,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    toggleFavorite,
  }
}
