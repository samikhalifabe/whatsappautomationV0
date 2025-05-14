"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoIcon, AlertCircle, CheckCircle2, Save } from "lucide-react";

import { useAutoScoutScraper } from "@/hooks/useAutoScoutScraper";
import { downloadCSV, downloadLogs, saveVehiclesToDatabase, Vehicle } from "@/utils/autoScoutUtils";

export default function AutoScoutPage() {
  const {
    url,
    setUrl,
    isRunning,
    progress,
    logs,
    results,
    error,
    success,
    multiPage,
    setMultiPage,
    startScraping,
    stopScraping
  } = useAutoScoutScraper();

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedCount, setSavedCount] = useState<number>(0);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  const handleSaveToDatabase = async () => {
    if (results.length === 0) return;

    setIsSaving(true);
    setSavedCount(0);

    try {
      const result = await saveVehiclesToDatabase(results as Vehicle[]);
      setSavedCount(result.savedCount);
      
      // Update success message
      const successMessage = `${result.savedCount} véhicules enregistrés avec succès en base de données`;
      
      // You might want to update the success state in the hook if possible
      // Alternatively, you can manage this locally
    } catch (err) {
      // Handle error (you might want to update error state)
      console.error("Erreur lors de l'enregistrement", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadLogs = () => {
    downloadLogs(logs);
  };

  const handleDownloadResults = () => {
    downloadCSV(results as Vehicle[]);
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Extraction AutoScout24</h1>
      
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert className="mb-4 bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-600">Succès</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
          <CardDescription>
            Entrez l'URL de recherche AutoScout24 à analyser
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex gap-4">
              <Input
                placeholder="https://www.autoscout24.be/fr/lst?..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isRunning}
                className="flex-1"
              />
              {isRunning ? (
                <Button variant="destructive" onClick={stopScraping}>
                  Arrêter
                </Button>
              ) : (
                <Button onClick={startScraping}>
                  Démarrer l'extraction
                </Button>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="multiPage"
                checked={multiPage}
                onChange={(e) => setMultiPage(e.target.checked)}
                disabled={isRunning}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="multiPage" className="text-sm font-medium text-gray-700">
                Extraction multi-pages (jusqu'à 20 pages)
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {isRunning && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Progression</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={progress} className="mb-2" />
            <p className="text-sm text-gray-500 text-right">{progress}%</p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="logs" className="mb-6">
        <TabsList>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="results">Résultats ({results.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Logs d'exécution</span>
                {logs.length > 0 && (
                  <Button onClick={handleDownloadLogs} size="sm" variant="outline">
                    Télécharger les logs
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-black text-green-400 p-4 rounded h-[400px] overflow-y-auto font-mono text-sm">
                {logs.length === 0 ? (
                  <p className="text-gray-500">Aucun log disponible</p>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} className="mb-1">
                      {log}
                    </div>
                  ))
                )}
                <div ref={logsEndRef} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="results">
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Véhicules extraits</span>
                <div className="flex gap-2">
                  {results.length > 0 && (
                    <>
                      <Button 
                        onClick={handleSaveToDatabase} 
                        size="sm" 
                        disabled={isSaving || results.length === 0}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Save className="mr-2 h-4 w-4" />
                        {isSaving ? 'Enregistrement...' : `Enregistrer en DB${savedCount > 0 ? ` (${savedCount})` : ''}`}
                      </Button>
                      <Button onClick={handleDownloadResults} size="sm">
                        Télécharger CSV
                      </Button>
                    </>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {results.length === 0 ? (
                <p className="text-gray-500">Aucun résultat disponible</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border p-2 text-left">Marque</th>
                        <th className="border p-2 text-left">Modèle</th>
                        <th className="border p-2 text-left">Prix</th>
                        <th className="border p-2 text-left">Année</th>
                        <th className="border p-2 text-left">Kilométrage</th>
                        <th className="border p-2 text-left">Carburant</th>
                        <th className="border p-2 text-left">Transmission</th>
                        <th className="border p-2 text-left">Localisation</th>
                        <th className="border p-2 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(results as Vehicle[]).map((vehicle, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="border p-2">{vehicle.marque}</td>
                          <td className="border p-2">{vehicle.modele}</td>
                          <td className="border p-2">{vehicle.prix}</td>
                          <td className="border p-2">{vehicle.annee}</td>
                          <td className="border p-2">{vehicle.kilometrage}</td>
                          <td className="border p-2">{vehicle.carburant || '-'}</td>
                          <td className="border p-2">{vehicle.transmission || '-'}</td>
                          <td className="border p-2">{vehicle.localisation || '-'}</td>
                          <td className="border p-2">
                            <a 
                              href={vehicle.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              Voir
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
