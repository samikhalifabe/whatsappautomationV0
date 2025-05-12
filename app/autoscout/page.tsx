"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoIcon, AlertCircle, CheckCircle2, Save } from "lucide-react";
import { createClient } from '@supabase/supabase-js';

export default function AutoScoutPage() {
  const [url, setUrl] = useState<string>("");
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedCount, setSavedCount] = useState<number>(0);
  const [multiPage, setMultiPage] = useState<boolean>(false);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  // Cleanup event source on unmount
  useEffect(() => {
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [eventSource]);

  const startScraping = async () => {
    if (!url) {
      setError("Veuillez entrer une URL valide");
      return;
    }

    try {
      setIsRunning(true);
      setProgress(0);
      setLogs([]);
      setResults([]);
      setError(null);
      setSuccess(null);
      setSavedCount(0);

      // Close any existing event source
      if (eventSource) {
        eventSource.close();
      }

      // Create a new event source for SSE
      const newEventSource = new EventSource(`/api/autoscout/scrape?url=${encodeURIComponent(url)}&multiPage=${multiPage}`);
      setEventSource(newEventSource);

      newEventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'log') {
          setLogs((prevLogs) => [...prevLogs, data.message]);
        } else if (data.type === 'progress') {
          setProgress(data.value);
        } else if (data.type === 'result') {
          setResults(data.vehicles);
        } else if (data.type === 'error') {
          setError(data.message);
          setIsRunning(false);
          newEventSource.close();
        } else if (data.type === 'complete') {
          setSuccess("Extraction terminée avec succès!");
          setIsRunning(false);
          newEventSource.close();
        }
      };

      newEventSource.onerror = () => {
        setError("Erreur de connexion au serveur");
        setIsRunning(false);
        newEventSource.close();
      };
    } catch (err) {
      setError("Une erreur est survenue lors du démarrage de l'extraction");
      setIsRunning(false);
    }
  };

  const stopScraping = () => {
    if (eventSource) {
      eventSource.close();
      setEventSource(null);
    }
    
    fetch('/api/autoscout/stop', { method: 'POST' })
      .then(() => {
        setLogs((prevLogs) => [...prevLogs, "Extraction arrêtée manuellement"]);
        setIsRunning(false);
      })
      .catch((err) => {
        setError("Erreur lors de l'arrêt de l'extraction");
      });
  };

  const saveToDatabase = async () => {
    if (results.length === 0) return;

    setIsSaving(true);
    setSavedCount(0);
    setLogs((prevLogs) => [...prevLogs, "Début de l'enregistrement en base de données..."]);

    try {
      // Fonction pour formater les numéros de téléphone
      const formatPhoneNumber = (phone: string) => {
        if (!phone) return '';
        
        // Supprimer tous les caractères non numériques
        let cleaned = phone.replace(/\D/g, '');
        
        // Supprimer le 0 initial si présent après le code pays
        if (cleaned.startsWith('32') && cleaned.length > 2 && cleaned.charAt(2) === '0') {
          cleaned = '32' + cleaned.substring(3);
        }
        
        // Si le numéro ne commence pas par un code pays, ajouter 32 (Belgique)
        if (!cleaned.startsWith('32') && cleaned.startsWith('0')) {
          cleaned = '32' + cleaned.substring(1);
        }
        
        return cleaned;
      };
      
      // Mise en forme des données selon votre schéma de base de données
      const formattedVehicles = results.map(vehicle => ({
        brand: vehicle.marque,
        model: vehicle.modele,
        price: parseFloat(vehicle.prix.replace(/[^\d]/g, '').replace(/(\d+)1,\s*5$/, '$1')),
        year: vehicle.annee ? parseInt(vehicle.annee) : new Date().getFullYear(),
        mileage: parseInt(vehicle.kilometrage.replace(/[^\d]/g, '')),
        fuel_type: vehicle.carburant || '',
        transmission: vehicle.transmission || '',
        power: vehicle.puissance ? parseInt(vehicle.puissance) : null,
        location: vehicle.localisation || '',
        listing_url: vehicle.url,
        phone: formatPhoneNumber(vehicle.telephone || ''),
        image_url: vehicle.image_url || '',
        contact_status: 'not_contacted',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      // Envoi des données à votre API
      const response = await fetch('/api/autoscout/vehicles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ vehicles: formattedVehicles }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`${data.savedCount} véhicules enregistrés avec succès en base de données`);
        setSavedCount(data.savedCount);
        setLogs((prevLogs) => [...prevLogs, `✅ ${data.savedCount} véhicules enregistrés avec succès`]);
      } else {
        throw new Error(data.error || 'Erreur lors de l\'enregistrement');
      }
    } catch (err: any) {
      setError("Erreur lors de l'enregistrement en base de données");
      setLogs((prevLogs) => [...prevLogs, `❌ Erreur: ${err.message}`]);
    } finally {
      setIsSaving(false);
    }
  };

  const saveProfessionalToDatabase = async () => {
    if (results.length === 0) return;

    setIsSaving(true);
    setSavedCount(0);
    setLogs((prevLogs) => [...prevLogs, "Début de l'enregistrement en base de données (Professionnel)..."]);

    try {
      // Fonction pour formater les numéros de téléphone
      const formatPhoneNumber = (phone: string) => {
        if (!phone) return '';

        // Supprimer tous les caractères non numériques
        let cleaned = phone.replace(/\D/g, '');

        // Supprimer le 0 initial si présent après le code pays
        if (cleaned.startsWith('32') && cleaned.length > 2 && cleaned.charAt(2) === '0') {
          cleaned = '32' + cleaned.substring(3);
        }

        // Si le numéro ne commence pas par un code pays, ajouter 32 (Belgique)
        if (!cleaned.startsWith('32') && cleaned.startsWith('0')) {
          cleaned = '32' + cleaned.substring(1);
        }

        return cleaned;
      };

      // Mise en forme des données selon votre schéma de base de données
      const formattedVehicles = results.map(vehicle => ({
        brand: vehicle.marque,
        model: vehicle.modele,
        price: parseFloat(vehicle.prix.replace(/[^\d]/g, '').replace(/(\d+)1,\s*5$/, '$1')),
        year: vehicle.annee ? parseInt(vehicle.annee) : new Date().getFullYear(),
        mileage: parseInt(vehicle.kilometrage.replace(/[^\d]/g, '')),
        fuel_type: vehicle.carburant || '',
        transmission: vehicle.transmission || '',
        power: vehicle.puissance ? parseInt(vehicle.puissance) : null,
        location: vehicle.localisation || '',
        listing_url: vehicle.url,
        phone: formatPhoneNumber(vehicle.telephone || ''),
        image_url: vehicle.image_url || '',
        contact_status: 'not_contacted',
        seller_type: 'professionnel', // Add seller_type here
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      // Envoi des données à votre API
      const response = await fetch('/api/autoscout/vehicles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ vehicles: formattedVehicles }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`${data.savedCount} véhicules enregistrés avec succès en base de données (Professionnel)`);
        setSavedCount(data.savedCount);
        setLogs((prevLogs) => [...prevLogs, `✅ ${data.savedCount} véhicules enregistrés avec succès (Professionnel)`]);
      } else {
        throw new Error(data.error || 'Erreur lors de l\'enregistrement (Professionnel)');
      }
    } catch (err: any) {
      setError("Erreur lors de l'enregistrement en base de données (Professionnel)");
      setLogs((prevLogs) => [...prevLogs, `❌ Erreur: ${err.message}`]);
    } finally {
      setIsSaving(false);
    }
  };

  const downloadLogs = () => {
    if (logs.length === 0) return;

    const logsContent = logs.join('\n');
    const blob = new Blob([logsContent], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'autoscout_logs.txt');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadResults = () => {
    if (results.length === 0) return;

    const headers = Object.keys(results[0]);
    const csvContent = [
      headers.join(','),
      ...results.map(row => 
        headers.map(header => {
          let value = row[header] || '';
          // Escape quotes and wrap in quotes if contains comma
          value = String(value).replace(/"/g, '""');
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            value = `"${value}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'autoscout_results.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
                  <Button onClick={downloadLogs} size="sm" variant="outline">
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
                        onClick={saveToDatabase} 
                        size="sm" 
                        disabled={isSaving || results.length === 0}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Save className="mr-2 h-4 w-4" />
                        {isSaving ? 'Enregistrement...' : `Enregistrer en DB${savedCount > 0 ? ` (${savedCount})` : ''}`}
                      </Button>
                      <Button 
                        onClick={() => saveProfessionalToDatabase()} 
                        size="sm" 
                        disabled={isSaving || results.length === 0}
                        className="bg-blue-600 hover:bg-blue-700" // Using a different color for distinction
                      >
                        <Save className="mr-2 h-4 w-4" />
                        {isSaving ? 'Enregistrement...' : `Enregistrer Pro en DB${savedCount > 0 ? ` (${savedCount})` : ''}`}
                      </Button>
                      <Button onClick={downloadResults} size="sm">
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
                      {results.map((vehicle, index) => (
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
