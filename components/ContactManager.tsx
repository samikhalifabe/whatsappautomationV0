"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useContacts } from "@/hooks/useContacts"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export default function ContactManager() {
  const { contacts, loading, error, tableExists, fetchContacts } = useContacts()

  if (!tableExists) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Gestionnaire de contacts</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Table manquante</AlertTitle>
            <AlertDescription>
              La table "contact_records" n'existe pas dans la base de données. Veuillez créer cette table pour utiliser
              cette fonctionnalité.
            </AlertDescription>
          </Alert>
          <div className="mt-4">
            <p className="text-sm text-muted-foreground">
              Pour créer la table, exécutez la requête SQL suivante dans votre base de données Supabase:
            </p>
            <pre className="mt-2 p-4 bg-muted rounded-md overflow-x-auto text-xs">
              {`CREATE TABLE public.contact_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID REFERENCES public.vehicles(id),
  first_contact_date TIMESTAMP WITH TIME ZONE NOT NULL,
  latest_contact_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL,
  favorite_rating INTEGER,
  price_offered NUMERIC,
  target_price NUMERIC,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID NOT NULL
);`}
            </pre>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return <div>Chargement des contacts...</div>
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Erreur</AlertTitle>
        <AlertDescription>
          {error}
          <Button variant="outline" size="sm" className="ml-2" onClick={() => fetchContacts()}>
            Réessayer
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Gestionnaire de contacts ({contacts.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {contacts.length === 0 ? (
          <p className="text-center text-muted-foreground">Aucun contact trouvé</p>
        ) : (
          <div className="space-y-4">
            {contacts.map((contact) => (
              <div key={contact.id} className="p-4 border rounded-md">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">Véhicule ID: {contact.vehicle_id || "N/A"}</p>
                    <p className="text-sm text-muted-foreground">
                      Statut: {contact.status} | Dernier contact:{" "}
                      {new Date(contact.latest_contact_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    {contact.price_offered && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {contact.price_offered}€
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
