"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { MessageTemplate } from "@/types/message"
import { useTemplates } from "@/hooks/useTemplates"
import { FileText, Plus, Trash2, Edit, Save, X, Copy, MessageSquare, Star, StarOff, Loader2 } from "lucide-react"

interface MessageTemplatesProps {
  onSelectTemplate: (template: MessageTemplate) => void
}

export default function MessageTemplates({ onSelectTemplate }: MessageTemplatesProps) {
  const { templates, loading, addTemplate, updateTemplate, deleteTemplate, toggleFavorite } = useTemplates()

  const [newTemplate, setNewTemplate] = useState<Omit<MessageTemplate, "id">>({
    name: "",
    content: "",
    category: "information",
    favorite: false,
  })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string>("all")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleAddTemplate = async () => {
    if (!newTemplate.name || !newTemplate.content) return

    setIsSubmitting(true)
    const success = await addTemplate(newTemplate)
    setIsSubmitting(false)

    if (success) {
      setNewTemplate({ name: "", content: "", category: "information", favorite: false })
      setShowAddForm(false)
    }
  }

  const handleUpdateTemplate = async () => {
    if (!newTemplate.name || !newTemplate.content || !editingId) return

    setIsSubmitting(true)
    const templateToUpdate = { ...newTemplate, id: editingId } as MessageTemplate
    const success = await updateTemplate(templateToUpdate)
    setIsSubmitting(false)

    if (success) {
      setNewTemplate({ name: "", content: "", category: "information", favorite: false })
      setEditingId(null)
    }
  }

  const handleDeleteTemplate = async (id: string) => {
    await deleteTemplate(id)
    if (editingId === id) {
      setEditingId(null)
      setNewTemplate({ name: "", content: "", category: "information", favorite: false })
    }
  }

  const handleToggleFavorite = async (id: string, currentFavorite: boolean) => {
    await toggleFavorite(id, !currentFavorite)
  }

  const startEditing = (template: MessageTemplate) => {
    setNewTemplate({
      name: template.name,
      content: template.content,
      category: template.category || "information",
      favorite: template.favorite || false,
    })
    setEditingId(template.id)
  }

  const cancelEdit = () => {
    setNewTemplate({ name: "", content: "", category: "information", favorite: false })
    setEditingId(null)
    setShowAddForm(false)
  }

  const handleSelectTemplate = (template: MessageTemplate) => {
    onSelectTemplate(template)
  }

  // Filtrer les modèles par catégorie
  const filteredTemplates = templates.filter((template) =>
    activeCategory === "all" || activeCategory === "favorites"
      ? template.favorite
      : template.category === activeCategory,
  )

  // Obtenir les catégories uniques
  const categories = Array.from(new Set(templates.map((t) => t.category))).filter(Boolean)

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#25D366]" />
            Modèles de messages
          </h2>
          <p className="text-sm text-muted-foreground">Utilisez des modèles prédéfinis pour gagner du temps</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setShowAddForm(!showAddForm)
            setEditingId(null)
            setNewTemplate({ name: "", content: "", category: "information", favorite: false })
          }}
          className="h-9"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nouveau modèle
        </Button>
      </div>

      {(showAddForm || editingId) && (
        <div className="mx-4 mb-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-md border animate-fadeIn">
          <h3 className="text-sm font-medium mb-3">{editingId ? "Modifier le modèle" : "Ajouter un modèle"}</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="template-name" className="text-xs">
                  Nom du modèle
                </Label>
                <Input
                  id="template-name"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  placeholder="Nom du modèle"
                  className="h-9 text-sm mt-1"
                />
              </div>
              <div>
                <Label htmlFor="template-category" className="text-xs">
                  Catégorie
                </Label>
                <select
                  id="template-category"
                  value={newTemplate.category}
                  onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
                  className="w-full h-9 text-sm mt-1 rounded-md border border-input bg-background px-3 py-1"
                >
                  <option value="information">Information</option>
                  <option value="rendez-vous">Rendez-vous</option>
                  <option value="negociation">Négociation</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="template-content" className="text-xs">
                  Contenu du message
                </Label>
                <div className="flex items-center">
                  <Label htmlFor="template-favorite" className="text-xs mr-2">
                    Favori
                  </Label>
                  <input
                    type="checkbox"
                    id="template-favorite"
                    checked={newTemplate.favorite}
                    onChange={(e) => setNewTemplate({ ...newTemplate, favorite: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                </div>
              </div>
              <Textarea
                id="template-content"
                value={newTemplate.content}
                onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                placeholder="Bonjour, je suis intéressé par votre {{marque}} {{modele}}..."
                className="min-h-[120px] text-sm mt-1 resize-y"
              />
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                <Badge
                  variant="outline"
                  className="text-xs bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors"
                  onClick={() => setNewTemplate({ ...newTemplate, content: newTemplate.content + "{{marque}}" })}
                >
                  {"{{marque}}"}
                </Badge>
                <Badge
                  variant="outline"
                  className="text-xs bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors"
                  onClick={() => setNewTemplate({ ...newTemplate, content: newTemplate.content + "{{modele}}" })}
                >
                  {"{{modele}}"}
                </Badge>
                <Badge
                  variant="outline"
                  className="text-xs bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors"
                  onClick={() => setNewTemplate({ ...newTemplate, content: newTemplate.content + "{{prix}}" })}
                >
                  {"{{prix}}"}
                </Badge>
                <Badge
                  variant="outline"
                  className="text-xs bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors"
                  onClick={() => setNewTemplate({ ...newTemplate, content: newTemplate.content + "{{annee}}" })}
                >
                  {"{{annee}}"}
                </Badge>
                <Badge
                  variant="outline"
                  className="text-xs bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors"
                  onClick={() => setNewTemplate({ ...newTemplate, content: newTemplate.content + "{{kilometrage}}" })}
                >
                  {"{{kilometrage}}"}
                </Badge>
                <Badge
                  variant="outline"
                  className="text-xs bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors"
                  onClick={() => setNewTemplate({ ...newTemplate, content: newTemplate.content + "{{url}}" })}
                >
                  {"{{url}}"}
                </Badge>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-1">
              <Button variant="outline" size="sm" onClick={cancelEdit} className="h-9 text-xs" disabled={isSubmitting}>
                <X className="h-3.5 w-3.5 mr-1" />
                Annuler
              </Button>
              <Button
                onClick={editingId ? handleUpdateTemplate : handleAddTemplate}
                size="sm"
                className="h-9 text-xs bg-[#25D366] hover:bg-[#128C7E] text-white"
                disabled={isSubmitting || !newTemplate.name || !newTemplate.content}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                    {editingId ? "Enregistrement..." : "Ajout..."}
                  </>
                ) : editingId ? (
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

      <div className="px-4">
        <Tabs defaultValue="all" value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 h-auto mb-4">
            <TabsTrigger
              value="all"
              className={cn(
                "flex items-center gap-1 text-xs rounded-md py-1.5 px-3 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700",
                activeCategory === "all" ? "shadow-sm" : "",
              )}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Tous</span>
            </TabsTrigger>
            <TabsTrigger
              value="favorites"
              className={cn(
                "flex items-center gap-1 text-xs rounded-md py-1.5 px-3 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700",
                activeCategory === "favorites" ? "shadow-sm" : "",
              )}
            >
              <Star className="h-3.5 w-3.5" />
              <span>Favoris</span>
            </TabsTrigger>
            {categories.map((category) => (
              <TabsTrigger
                key={category}
                value={category}
                className={cn(
                  "flex items-center gap-1 text-xs rounded-md py-1.5 px-3 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700",
                  activeCategory === category ? "shadow-sm" : "",
                )}
              >
                <span className="capitalize">{category}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <ScrollArea className="h-[500px] border rounded-md">
            {loading ? (
              <div className="p-3 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-3 border rounded-md">
                    <div className="flex items-center justify-between mb-2">
                      <Skeleton className="h-5 w-40" />
                      <div className="flex gap-1">
                        <Skeleton className="h-7 w-7 rounded-md" />
                        <Skeleton className="h-7 w-7 rounded-md" />
                        <Skeleton className="h-7 w-7 rounded-md" />
                      </div>
                    </div>
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-4 w-3/4 mb-3" />
                    <div className="flex justify-end">
                      <Skeleton className="h-8 w-32" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 space-y-3">
                {filteredTemplates.length > 0 ? (
                  filteredTemplates.map((template) => (
                    <div
                      key={template.id}
                      className={cn(
                        "p-3 border rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors",
                        template.favorite ? "border-[#25D366]/30 bg-[#25D366]/5" : "",
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-sm">{template.name}</h3>
                          {template.category && (
                            <Badge variant="outline" className="text-xs capitalize">
                              {template.category}
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleFavorite(template.id, template.favorite || false)}
                            className="h-7 w-7"
                            title={template.favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                          >
                            {template.favorite ? (
                              <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                            ) : (
                              <StarOff className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => startEditing(template)}
                            className="h-7 w-7"
                            title="Modifier"
                          >
                            <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="h-7 w-7"
                            title="Supprimer"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3 whitespace-pre-wrap">{template.content}</p>
                      <div className="flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSelectTemplate(template)}
                          className="h-8 text-xs"
                        >
                          <Copy className="h-3.5 w-3.5 mr-1" />
                          Utiliser ce modèle
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-[400px] text-center">
                    <FileText className="h-12 w-12 text-muted-foreground opacity-20 mb-3" />
                    <p className="text-muted-foreground">Aucun modèle trouvé</p>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => {
                        setActiveCategory("all")
                        setShowAddForm(true)
                      }}
                      className="mt-2"
                    >
                      Créer un nouveau modèle
                    </Button>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </Tabs>
      </div>
    </div>
  )
}
