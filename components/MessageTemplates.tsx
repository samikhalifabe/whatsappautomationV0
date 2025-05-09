"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { MessageTemplate } from "@/types/message"
import { FileText, Plus, Trash2, Edit, Save, X, Copy } from "lucide-react"

interface MessageTemplatesProps {
  onSelectTemplate: (template: MessageTemplate) => void
}

export default function MessageTemplates({ onSelectTemplate }: MessageTemplatesProps) {
  const [templates, setTemplates] = useState<MessageTemplate[]>([
    {
      id: "1",
      name: "Demande d'information véhicule",
      content: "Bonjour, je suis intéressé par votre {{marque}} {{modele}} de {{annee}} à {{prix}}€. Est-elle toujours disponible ? Merci.",
    },
    {
      id: "2",
      name: "Demande de rendez-vous",
      content: "Bonjour, je souhaiterais voir votre {{marque}} {{modele}} à {{prix}}€. Seriez-vous disponible pour une visite cette semaine ? Merci.",
    },
    {
      id: "3",
      name: "Négociation prix",
      content: "Bonjour, je suis intéressé par votre {{marque}} {{modele}} de {{annee}} avec {{kilometrage}} km. Seriez-vous ouvert à une offre de [VOTRE PRIX]€ ? Merci pour votre retour.",
    },
    {
      id: "4",
      name: "Demande d'informations techniques",
      content: "Bonjour, concernant votre {{marque}} {{modele}} de {{annee}}, pourriez-vous me donner plus d'informations sur l'entretien et l'historique du véhicule ? Merci d'avance.",
    },
    {
      id: "5",
      name: "Demande avec lien de l'annonce",
      content: "Bonjour, je suis intéressé par votre véhicule dans cette annonce: {{url}}. Pourriez-vous me donner plus d'informations ? Merci.",
    },
  ])
  const [newTemplate, setNewTemplate] = useState<MessageTemplate>({ id: "", name: "", content: "" })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)

  const addTemplate = () => {
    if (!newTemplate.name || !newTemplate.content) return

    const template: MessageTemplate = {
      id: Date.now().toString(),
      name: newTemplate.name,
      content: newTemplate.content,
    }

    setTemplates([...templates, template])
    setNewTemplate({ id: "", name: "", content: "" })
    setShowAddForm(false)
  }

  const startEditing = (template: MessageTemplate) => {
    setNewTemplate({ ...template })
    setEditingId(template.id)
  }

  const saveEdit = () => {
    if (!newTemplate.name || !newTemplate.content) return

    setTemplates(templates.map((template) => (template.id === editingId ? { ...newTemplate } : template)))
    setNewTemplate({ id: "", name: "", content: "" })
    setEditingId(null)
  }

  const cancelEdit = () => {
    setNewTemplate({ id: "", name: "", content: "" })
    setEditingId(null)
    setShowAddForm(false)
  }

  const deleteTemplate = (id: string) => {
    setTemplates(templates.filter((template) => template.id !== id))
    if (editingId === id) {
      setEditingId(null)
      setNewTemplate({ id: "", name: "", content: "" })
    }
  }

  const handleSelectTemplate = (template: MessageTemplate) => {
    onSelectTemplate(template)
  }

  return (
    <Card className="shadow-md border-0">
      <CardHeader className="bg-slate-50 dark:bg-slate-800 rounded-t-lg pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#25D366]" />
            <CardTitle className="text-lg">Modèles de messages</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setShowAddForm(!showAddForm)
              setEditingId(null)
              setNewTemplate({ id: "", name: "", content: "" })
            }}
            className="text-xs h-8"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Nouveau modèle
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {(showAddForm || editingId) && (
          <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-md">
            <h3 className="text-sm font-medium mb-2">{editingId ? "Modifier le modèle" : "Ajouter un modèle"}</h3>
            <div className="space-y-3">
              <div>
                <Label htmlFor="template-name" className="text-xs">
                  Nom du modèle
                </Label>
                <Input
                  id="template-name"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  placeholder="Nom du modèle"
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label htmlFor="template-content" className="text-xs">
                  Contenu (utilisez les variables comme &#123;&#123;marque&#125;&#125;, &#123;&#123;modele&#125;&#125;, &#123;&#123;url&#125;&#125;, etc.)
                </Label>
                <Textarea
                  id="template-content"
                  value={newTemplate.content}
                  onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                  placeholder="Bonjour, je suis intéressé par votre {{marque}} {{modele}}..."
                  className="min-h-[100px] text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 mt-1">
                <Button variant="outline" size="sm" onClick={cancelEdit} className="h-8 text-xs">
                  <X className="h-3.5 w-3.5 mr-1" />
                  Annuler
                </Button>
                <Button
                  onClick={editingId ? saveEdit : addTemplate}
                  size="sm"
                  className="h-8 text-xs bg-[#25D366] hover:bg-[#128C7E] text-white"
                >
                  {editingId ? (
                    <>
                      <Save className="h-3.5 w-3.5 mr-1" />
                      Enregistrer
                    </>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Ajouter
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-3">
            {templates.map((template) => (
              <div key={template.id} className="p-3 border rounded-md hover:bg-slate-50 dark:hover:bg-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-sm">{template.name}</h3>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => startEditing(template)} className="h-6 w-6">
                      <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteTemplate(template.id)} className="h-6 w-6">
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-2 whitespace-pre-wrap">{template.content}</p>
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectTemplate(template)}
                    className="h-7 text-xs"
                  >
                    <Copy className="h-3.5 w-3.5 mr-1" />
                    Utiliser
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
