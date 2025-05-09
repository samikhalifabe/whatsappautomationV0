"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { Trash2, UserPlus, Users, Phone } from "lucide-react"
import { useContacts } from "@/hooks/useContacts"
import type { Database } from "@/types/supabase"

type ContactRecord = Database["public"]["Tables"]["contact_records"]["Row"]

// Temporary user ID until authentication is implemented
const TEMP_USER_ID = "00000000-0000-0000-0000-000000000000"

interface ContactManagerProps {
  onContactsSelected: (contacts: ContactRecord[]) => void
}

export default function ContactManager({ onContactsSelected }: ContactManagerProps) {
  const { contacts, loading, error, addContact, deleteContact } = useContacts()
  
  const [newContact, setNewContact] = useState<{ 
    first_contact_date: string;
    latest_contact_date: string;
    status: string;
    user_id: string;
    notes: string | null;
  }>({ 
    first_contact_date: new Date().toISOString(),
    latest_contact_date: new Date().toISOString(),
    status: "Nouveau",
    user_id: TEMP_USER_ID,
    notes: null
  })
  
  // For phone input (since it's not part of the contact_records table)
  const [phoneInput, setPhoneInput] = useState("")
  const [selectedContacts, setSelectedContacts] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [showAddContact, setShowAddContact] = useState(false)

  const handleAddContact = async () => {
    if (!phoneInput) return

    try {
      // In a real application, you would create a vehicle first or link to an existing one
      // For now, we're just creating a contact record without a vehicle
      await addContact({
        ...newContact,
        first_contact_date: new Date().toISOString(),
        latest_contact_date: new Date().toISOString(),
        status: "Nouveau",
        user_id: TEMP_USER_ID
      })
      
      setNewContact({ 
        first_contact_date: new Date().toISOString(),
        latest_contact_date: new Date().toISOString(),
        status: "Nouveau",
        user_id: TEMP_USER_ID,
        notes: null
      })
      setPhoneInput("")
      setShowAddContact(false)
    } catch (err) {
      console.error("Error adding contact:", err)
    }
  }

  const handleDeleteContact = async (id: string) => {
    try {
      await deleteContact(id)
      setSelectedContacts(selectedContacts.filter((contactId) => contactId !== id))
    } catch (err) {
      console.error("Error deleting contact:", err)
    }
  }

  const toggleContactSelection = (id: string) => {
    if (selectedContacts.includes(id)) {
      setSelectedContacts(selectedContacts.filter((contactId) => contactId !== id))
    } else {
      setSelectedContacts([...selectedContacts, id])
    }
  }

  const selectAllContacts = () => {
    if (selectedContacts.length === contacts.length) {
      setSelectedContacts([])
    } else {
      setSelectedContacts(contacts.map((contact) => contact.id))
    }
  }

  const confirmSelection = () => {
    const selected = contacts.filter((contact) => selectedContacts.includes(contact.id))
    onContactsSelected(selected)
  }

  const filteredContacts = contacts.filter(
    (contact) => {
      // Search in notes or other fields that might contain searchable information
      const searchableText = `${contact.notes || ""} ${contact.status || ""}`
      return searchableText.toLowerCase().includes(searchTerm.toLowerCase())
    }
  )

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric'
    })
  }

  return (
    <Card className="shadow-md border-0">
      <CardHeader className="bg-slate-50 dark:bg-slate-800 rounded-t-lg pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-[#25D366]" />
            <CardTitle className="text-lg">Gestion des contacts</CardTitle>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddContact(!showAddContact)}
              className="text-xs h-8"
            >
              <UserPlus className="h-3.5 w-3.5 mr-1" />
              Contact
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {showAddContact && (
          <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-md">
            <h3 className="text-sm font-medium mb-2">Ajouter un contact</h3>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <Label htmlFor="phone" className="text-xs">
                  Numéro de téléphone (format international sans +)
                </Label>
                <Input
                  id="phone"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="33612345678"
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label htmlFor="notes" className="text-xs">
                  Notes
                </Label>
                <Input
                  id="notes"
                  value={newContact.notes || ""}
                  onChange={(e) => setNewContact({ ...newContact, notes: e.target.value || null })}
                  placeholder="Notes sur ce contact"
                  className="h-8 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 mt-1">
                <Button variant="outline" size="sm" onClick={() => setShowAddContact(false)} className="h-8 text-xs">
                  Annuler
                </Button>
                <Button
                  onClick={handleAddContact}
                  size="sm"
                  className="h-8 text-xs bg-[#25D366] hover:bg-[#128C7E] text-white"
                >
                  Ajouter
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="mb-4">
          <Input
            placeholder="Rechercher un contact..."
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
                  checked={selectedContacts.length > 0 && selectedContacts.length === contacts.length}
                  onCheckedChange={selectAllContacts}
                />
                <Label htmlFor="select-all" className="text-xs font-medium">
                  Sélectionner tout ({selectedContacts.length}/{contacts.length})
                </Label>
              </div>
              <Button
                size="sm"
                onClick={confirmSelection}
                disabled={selectedContacts.length === 0}
                className="h-7 text-xs bg-[#25D366] hover:bg-[#128C7E] text-white"
              >
                Utiliser la sélection
              </Button>
            </div>

            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-2">
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Chargement des contacts...</div>
                ) : filteredContacts.length > 0 ? (
                  filteredContacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="flex items-center justify-between p-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id={`contact-${contact.id}`}
                          checked={selectedContacts.includes(contact.id)}
                          onCheckedChange={() => toggleContactSelection(contact.id)}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="font-medium text-sm">Contact ID: {contact.id.substring(0, 8)}</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Dernier contact: {formatDate(contact.latest_contact_date)}
                          </div>
                          {contact.notes && (
                            <div className="text-xs mt-1 text-muted-foreground">{contact.notes}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteContact(contact.id)}
                          className="h-6 w-6"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">Aucun contact trouvé</div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
