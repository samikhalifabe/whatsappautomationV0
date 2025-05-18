import type { MessageTemplate } from "@/types/message"

export const templateService = {
  // Récupérer tous les modèles
  async getTemplates(): Promise<MessageTemplate[]> {
    try {
      const response = await fetch("/api/templates")
      if (!response.ok) {
        throw new Error("Erreur lors de la récupération des modèles")
      }
      return await response.json()
    } catch (error) {
      console.error("Erreur lors de la récupération des modèles:", error)
      return []
    }
  },

  // Ajouter un nouveau modèle
  async addTemplate(template: Omit<MessageTemplate, "id">): Promise<MessageTemplate | null> {
    try {
      const response = await fetch("/api/templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(template),
      })

      if (!response.ok) {
        throw new Error("Erreur lors de l'ajout du modèle")
      }

      return await response.json()
    } catch (error) {
      console.error("Erreur lors de l'ajout du modèle:", error)
      return null
    }
  },

  // Mettre à jour un modèle existant
  async updateTemplate(template: MessageTemplate): Promise<MessageTemplate | null> {
    try {
      const response = await fetch(`/api/templates/${template.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(template),
      })

      if (!response.ok) {
        throw new Error("Erreur lors de la mise à jour du modèle")
      }

      return await response.json()
    } catch (error) {
      console.error("Erreur lors de la mise à jour du modèle:", error)
      return null
    }
  },

  // Supprimer un modèle
  async deleteTemplate(id: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/templates/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Erreur lors de la suppression du modèle")
      }

      return true
    } catch (error) {
      console.error("Erreur lors de la suppression du modèle:", error)
      return false
    }
  },

  // Mettre à jour le statut favori d'un modèle
  async toggleFavorite(id: string, favorite: boolean): Promise<boolean> {
    try {
      const response = await fetch(`/api/templates/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ favorite }),
      })

      if (!response.ok) {
        throw new Error("Erreur lors de la mise à jour du statut favori")
      }

      return true
    } catch (error) {
      console.error("Erreur lors de la mise à jour du statut favori:", error)
      return false
    }
  },
}
