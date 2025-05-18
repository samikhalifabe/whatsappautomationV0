"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, RefreshCw } from "lucide-react"

export default function LogsPage() {
  const [logs, setLogs] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false)
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Fonction pour récupérer les logs
  const fetchLogs = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/logs")

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`)
      }

      const data = await response.json()
      setLogs(data)
    } catch (err: any) {
      setError(`Erreur lors de la récupération des logs: ${err.message}`)
      console.error("Erreur lors de la récupération des logs:", err)
    } finally {
      setLoading(false)
    }
  }

  // Récupérer les logs au chargement de la page
  useEffect(() => {
    fetchLogs()

    // Nettoyer l'intervalle d'auto-refresh au démontage du composant
    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current)
      }
    }
  }, [])

  // Gérer l'auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      autoRefreshIntervalRef.current = setInterval(fetchLogs, 5000) // Rafraîchir toutes les 5 secondes
    } else if (autoRefreshIntervalRef.current) {
      clearInterval(autoRefreshIntervalRef.current)
      autoRefreshIntervalRef.current = null
    }

    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current)
      }
    }
  }, [autoRefresh])

  // Fonction pour télécharger les logs
  const downloadLogs = () => {
    if (!logs) return

    const logsContent = JSON.stringify(logs, null, 2)
    const blob = new Blob([logsContent], { type: "application/json;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `logs_${new Date().toISOString().replace(/:/g, "-")}.json`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Formater les logs système
  const formatSystemLogs = (systemLogs: any) => {
    if (!systemLogs) return null

    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium">Uptime</h3>
          <pre className="bg-gray-100 p-2 rounded overflow-x-auto">{systemLogs.uptime}</pre>
        </div>
        <div>
          <h3 className="text-lg font-medium">Mémoire</h3>
          <pre className="bg-gray-100 p-2 rounded overflow-x-auto">{systemLogs.memory}</pre>
        </div>
        <div>
          <h3 className="text-lg font-medium">Espace disque</h3>
          <pre className="bg-gray-100 p-2 rounded overflow-x-auto">{systemLogs.disk}</pre>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Logs du système</h1>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-2">
          <Button onClick={fetchLogs} disabled={loading} className="flex items-center">
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Chargement..." : "Rafraîchir"}
          </Button>
          <Button variant={autoRefresh ? "default" : "outline"} onClick={() => setAutoRefresh(!autoRefresh)}>
            {autoRefresh ? "Désactiver" : "Activer"} l'auto-refresh
          </Button>
        </div>

        {logs && (
          <Button onClick={downloadLogs} variant="outline">
            Télécharger les logs
          </Button>
        )}
      </div>

      {logs ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informations générales</CardTitle>
              <CardDescription>Dernière mise à jour: {new Date(logs.timestamp).toLocaleString()}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-3 h-3 rounded-full ${logs.whatsapp.isRunning ? "bg-green-500" : "bg-red-500"}`}
                  ></div>
                  <span>Serveur WhatsApp: {logs.whatsapp.isRunning ? "En cours d'exécution" : "Arrêté"}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-3 h-3 rounded-full ${logs.nextjs.isRunning ? "bg-green-500" : "bg-red-500"}`}
                  ></div>
                  <span>Application Next.js: {logs.nextjs.isRunning ? "En cours d'exécution" : "Arrêtée"}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="whatsapp">
            <TabsList>
              <TabsTrigger value="whatsapp">Serveur WhatsApp</TabsTrigger>
              <TabsTrigger value="nextjs">Application Next.js</TabsTrigger>
              <TabsTrigger value="system">Système</TabsTrigger>
            </TabsList>

            <TabsContent value="whatsapp">
              <Card>
                <CardHeader>
                  <CardTitle>Logs du serveur WhatsApp</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-black text-green-400 p-4 rounded h-[400px] overflow-y-auto font-mono text-sm">
                    {logs.whatsapp.logs}
                  </div>
                </CardContent>
                <CardFooter>
                  <p className="text-sm text-gray-500">
                    Pour voir les logs complets du serveur WhatsApp, consultez le terminal où le serveur est exécuté.
                  </p>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="nextjs">
              <Card>
                <CardHeader>
                  <CardTitle>Logs de l'application Next.js</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-black text-green-400 p-4 rounded h-[400px] overflow-y-auto font-mono text-sm">
                    {logs.nextjs.logs}
                  </div>
                </CardContent>
                <CardFooter>
                  <p className="text-sm text-gray-500">
                    Pour voir les logs complets de l'application Next.js, consultez le terminal où l'application est
                    exécutée.
                  </p>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="system">
              <Card>
                <CardHeader>
                  <CardTitle>Logs système</CardTitle>
                </CardHeader>
                <CardContent>{formatSystemLogs(logs.system)}</CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Card>
            <CardHeader>
              <CardTitle>Conseils de débogage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium">Débogage du serveur WhatsApp</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      Exécutez le serveur avec <code className="bg-gray-100 p-1 rounded">node server.js</code> pour voir
                      les logs en temps réel.
                    </li>
                    <li>
                      Utilisez <code className="bg-gray-100 p-1 rounded">console.log()</code> pour afficher des
                      informations de débogage.
                    </li>
                    <li>
                      Pour un débogage plus avancé, exécutez{" "}
                      <code className="bg-gray-100 p-1 rounded">node --inspect server.js</code> et utilisez Chrome
                      DevTools.
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-medium">Débogage de l'application Next.js</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      Exécutez l'application avec <code className="bg-gray-100 p-1 rounded">npm run dev</code> pour voir
                      les logs en temps réel.
                    </li>
                    <li>Utilisez les outils de développement du navigateur pour déboguer le frontend.</li>
                    <li>
                      Pour déboguer les API routes, ajoutez des{" "}
                      <code className="bg-gray-100 p-1 rounded">console.log()</code> dans vos fichiers route.ts.
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-medium">Débogage avec VS Code</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      Configurez le fichier launch.json pour déboguer le serveur WhatsApp et l'application Next.js.
                    </li>
                    <li>Utilisez des points d'arrêt pour suspendre l'exécution et inspecter les variables.</li>
                    <li>
                      Consultez la{" "}
                      <a
                        href="https://code.visualstudio.com/docs/nodejs/nodejs-debugging"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        documentation VS Code
                      </a>{" "}
                      pour plus d'informations.
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-gray-500">
                Aucune donnée disponible. Cliquez sur "Rafraîchir" pour récupérer les logs.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
