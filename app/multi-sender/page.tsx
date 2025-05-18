"use client"

import dynamic from "next/dynamic"
import { DashboardLayout } from "@/components/DashboardLayout"
import { WhatsAppProvider } from "@/components/WhatsAppContext"
import { Loader2 } from "lucide-react"

// Import dynamique pour éviter les problèmes SSR
const MultiSender = dynamic(() => import("../../components/MultiSender"), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-[#25D366]" />
    </div>
  ),
})

export default function MultiSenderPage() {
  return (
    <WhatsAppProvider>
      <DashboardLayout>
        <MultiSender />
      </DashboardLayout>
    </WhatsAppProvider>
  )
}
