"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { MessageSquare, QrCode, Send, Car, MessageCircle } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { WhatsAppProvider } from "@/components/WhatsAppContext"

// Import dynamique pour éviter les problèmes SSR
const WhatsAppInterface = dynamic(() => import("../components/WhatsAppInterface"), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center min-h-[400px]">
      <div className="animate-pulse flex flex-col items-center">
        <div className="rounded-full bg-slate-200 h-12 w-12 mb-4"></div>
        <div className="h-4 bg-slate-200 rounded w-24 mb-2.5"></div>
        <div className="h-2 bg-slate-200 rounded w-32"></div>
      </div>
    </div>
  ),
})

const MultiSender = dynamic(() => import("../components/MultiSender"), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center min-h-[400px]">
      <div className="animate-pulse flex flex-col items-center">
        <div className="rounded-full bg-slate-200 h-12 w-12 mb-4"></div>
        <div className="h-4 bg-slate-200 rounded w-24 mb-2.5"></div>
        <div className="h-2 bg-slate-200 rounded w-32"></div>
      </div>
    </div>
  ),
})

const ConversationsList = dynamic(() => import("../components/ConversationsList"), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center min-h-[400px]">
      <div className="animate-pulse flex flex-col items-center">
        <div className="rounded-full bg-slate-200 h-12 w-12 mb-4"></div>
        <div className="h-4 bg-slate-200 rounded w-24 mb-2.5"></div>
        <div className="h-2 bg-slate-200 rounded w-32"></div>
      </div>
    </div>
  ),
})

const VehicleManager = dynamic(() => import("../components/VehicleManager"), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center min-h-[400px]">
      <div className="animate-pulse flex flex-col items-center">
        <div className="rounded-full bg-slate-200 h-12 w-12 mb-4"></div>
        <div className="h-4 bg-slate-200 rounded w-24 mb-2.5"></div>
        <div className="h-2 bg-slate-200 rounded w-32"></div>
      </div>
    </div>
  ),
})

export default function Home() {
  return (
    <WhatsAppProvider>
      <main className="min-h-screen bg-gradient-to-b from-white to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <div className="container mx-auto px-4 py-8">
          <header className="mb-8 text-center">
            <h1 className="text-3xl md:text-4xl font-bold mb-4 text-slate-800 dark:text-white">WhatsApp Automation</h1>
            <p className="text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              Automatisez l'envoi de messages WhatsApp depuis votre navigateur. Connectez-vous avec un QR code et envoyez
              des messages facilement.
            </p>
          </header>

          <div className="flex justify-end mb-4 max-w-5xl mx-auto">
            <Link href="/conversations">
              <Button variant="outline" className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                Voir toutes les conversations
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-12 max-w-5xl mx-auto">
            <Card className="border-0 shadow-md">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <div className="bg-[#25D366]/10 p-3 rounded-full mb-4">
                    <QrCode className="h-6 w-6 text-[#25D366]" />
                  </div>
                  <h3 className="font-medium mb-2">Connexion simple</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Scannez un QR code pour connecter votre compte WhatsApp
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <div className="bg-[#25D366]/10 p-3 rounded-full mb-4">
                    <MessageSquare className="h-6 w-6 text-[#25D366]" />
                  </div>
                  <h3 className="font-medium mb-2">Messages personnalisés</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Créez et envoyez des messages personnalisés à vos contacts
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <div className="bg-[#25D366]/10 p-3 rounded-full mb-4">
                    <Send className="h-6 w-6 text-[#25D366]" />
                  </div>
                  <h3 className="font-medium mb-2">Envoi multiple</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Envoyez des messages à plusieurs contacts avec des délais intelligents
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <div className="bg-[#25D366]/10 p-3 rounded-full mb-4">
                    <Car className="h-6 w-6 text-[#25D366]" />
                  </div>
                  <h3 className="font-medium mb-2">Gestion des véhicules</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Gérez vos véhicules et contactez les vendeurs directement
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <div className="bg-[#25D366]/10 p-3 rounded-full mb-4">
                    <MessageCircle className="h-6 w-6 text-[#25D366]" />
                  </div>
                  <h3 className="font-medium mb-2">Conversations</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Consultez et gérez toutes vos conversations WhatsApp
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="max-w-5xl mx-auto">
            <Tabs defaultValue="single">
              <TabsList className="mb-4">
                <TabsTrigger value="single">Envoi simple</TabsTrigger>
                <TabsTrigger value="multi">Envoi multiple</TabsTrigger>
                <TabsTrigger value="vehicles">Véhicules</TabsTrigger>
                <TabsTrigger value="conversations">Conversations</TabsTrigger>
              </TabsList>
              <TabsContent value="single">
                <WhatsAppInterface />
              </TabsContent>
              <TabsContent value="multi">
                <MultiSender />
              </TabsContent>
              <TabsContent value="vehicles">
                <VehicleManager />
              </TabsContent>
              <TabsContent value="conversations">
                <ConversationsList />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </WhatsAppProvider>
  )
}
