import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Send, MessageSquare, Car, Database } from "lucide-react"
import Link from "next/link"

export function QuickActions() {
  return (
    <Card className="shadow-sm border-0">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Actions rapides</CardTitle>
        <CardDescription>Accédez rapidement aux fonctionnalités principales</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          <Link href="/multi-sender">
            <Button variant="outline" className="w-full justify-start">
              <Send className="mr-2 h-4 w-4 text-[#25D366]" />
              Envoi multiple
            </Button>
          </Link>
          <Link href="/conversations">
            <Button variant="outline" className="w-full justify-start">
              <MessageSquare className="mr-2 h-4 w-4 text-[#25D366]" />
              Conversations
            </Button>
          </Link>
          <Link href="/autoscout">
            <Button variant="outline" className="w-full justify-start">
              <Car className="mr-2 h-4 w-4 text-[#25D366]" />
              AutoScout24
            </Button>
          </Link>
          <Link href="/db-conversations">
            <Button variant="outline" className="w-full justify-start">
              <Database className="mr-2 h-4 w-4 text-[#25D366]" />
              Base de données
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
