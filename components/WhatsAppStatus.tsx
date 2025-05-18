"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, QrCode } from "lucide-react"

interface WhatsAppStatusProps {
  status: string
  qrCode: string | null
  lastChecked: Date | null
  onRefresh: () => void
  isRefreshing: boolean
}

export function WhatsAppStatus({ status, qrCode, lastChecked, onRefresh, isRefreshing }: WhatsAppStatusProps) {
  return (
    <Card className="shadow-sm border-0">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <QrCode className="h-5 w-5 text-[#25D366]" />
              Statut WhatsApp
            </CardTitle>
            <CardDescription>
              {status === "connected"
                ? "Connecté et prêt à envoyer des messages"
                : "Scannez le QR code pour vous connecter"}
            </CardDescription>
          </div>
          <Badge
            variant={status === "connected" ? "default" : "destructive"}
            className={`${status === "connected" ? "bg-[#25D366]" : ""}`}
          >
            {status === "connected" ? "Connecté" : "Déconnecté"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center">
          {qrCode ? (
            <div className="p-4 bg-white rounded-lg">
              <img src={qrCode || "/placeholder.svg"} alt="QR Code WhatsApp" className="w-48 h-48" />
            </div>
          ) : status === "connected" ? (
            <div className="p-8 text-center">
              <div className="bg-[#25D366]/10 p-4 rounded-full mb-4 inline-block">
                <QrCode className="h-12 w-12 text-[#25D366]" />
              </div>
              <p className="text-sm text-muted-foreground">WhatsApp est connecté et prêt à être utilisé</p>
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="bg-red-100 p-4 rounded-full mb-4 inline-block">
                <QrCode className="h-12 w-12 text-red-500" />
              </div>
              <p className="text-sm text-muted-foreground">En attente du QR code...</p>
            </div>
          )}
          <div className="mt-4 flex items-center justify-between w-full">
            <span className="text-xs text-muted-foreground">
              Dernier statut vérifié: {lastChecked ? lastChecked.toLocaleTimeString() : "Jamais"}
            </span>
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={isRefreshing}>
              <RefreshCw className={`mr-2 h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              Actualiser
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
