"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Bot } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Added for success/error messages

// Interface pour la configuration de l'IA
export interface AIConfig {
  enabled: boolean;
  respondToAll: boolean;
  keywords: string[];
  systemPrompt: string;
  typingDelays?: {
    enabled: boolean;
    minDelay: number;
    maxDelay: number;
    wordsPerMinute: number;
    randomizeDelay: boolean;
    showTypingIndicator: boolean;
  };
  unavailabilityKeywords?: string[];
  pauseBotOnPriceOffer?: boolean;
}

interface AIConfigPanelProps {
  // Props can be added here if needed, e.g., an onToggle callback
}

const AIConfigPanel: React.FC<AIConfigPanelProps> = () => {
  const [aiConfig, setAIConfig] = useState<AIConfig>({
    enabled: false,
    respondToAll: false,
    keywords: [],
    systemPrompt: "",
    typingDelays: {
      enabled: false,
      minDelay: 2000,
      maxDelay: 15000,
      wordsPerMinute: 40,
      randomizeDelay: true,
      showTypingIndicator: true
    },
    unavailabilityKeywords: [],
    pauseBotOnPriceOffer: true
  });
  const [keywordInput, setKeywordInput] = useState<string>("");
  const [unavailabilityKeywordInput, setUnavailabilityKeywordInput] = useState<string>("");
  const [updatingAIConfig, setUpdatingAIConfig] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState<boolean>(false);

  // Récupérer la configuration de l'IA
  const fetchAIConfig = async () => {
    try {
      setError(null);
      const response = await axios.get<{ success: boolean, config: AIConfig & { unavailabilityKeywords?: string[] } }>('http://localhost:3001/api/whatsapp/ai-config');
      if (response.data.success && response.data.config) {
        const fetchedConfig = response.data.config;
        const sanitizedDelays = fetchedConfig.typingDelays || {
          enabled: false, minDelay: 2000, maxDelay: 15000, wordsPerMinute: 40, randomizeDelay: true, showTypingIndicator: true
        };
        setAIConfig({
          ...fetchedConfig,
          typingDelays: sanitizedDelays,
          unavailabilityKeywords: Array.isArray(fetchedConfig.unavailabilityKeywords) ? fetchedConfig.unavailabilityKeywords : [],
          pauseBotOnPriceOffer: typeof fetchedConfig.pauseBotOnPriceOffer === 'boolean' ? fetchedConfig.pauseBotOnPriceOffer : true
        });
      } else {
         console.error('Failed to fetch AI config or invalid format:', response.data);
         setError('Impossible de récupérer la configuration IA: Format invalide');
      }
    } catch (err: any) {
      console.error('Erreur lors de la récupération de la configuration IA:', err);
      setError(`Impossible de récupérer la configuration IA: ${err.message}`);
    }
  };

  // Mettre à jour la configuration de l'IA
  const updateAIConfigHandler = async () => {
    try {
      setUpdatingAIConfig(true);
      setError(null);
      setUpdateSuccess(false);
      const payload = { ...aiConfig };
      console.log("Sending AI Config Payload:", payload);
      const response = await axios.post('http://localhost:3001/api/whatsapp/ai-config', payload);
      
      if (response.data.success) {
        setUpdateSuccess(true);
        setTimeout(() => setUpdateSuccess(false), 3000);
      } else {
        setError(response.data.message || "Échec de la mise à jour de la configuration IA.");
      }
    } catch (err: any) {
      console.error('Erreur lors de la mise à jour de la configuration IA:', err);
      setError(`Impossible de mettre à jour la configuration IA: ${err.message}`);
    } finally {
      setUpdatingAIConfig(false);
    }
  };

  // Ajouter un mot-clé à la liste
  const addKeyword = () => {
    if (keywordInput.trim()) {
      if (!aiConfig.keywords.includes(keywordInput.trim())) {
        setAIConfig({
          ...aiConfig,
          keywords: [...aiConfig.keywords, keywordInput.trim()]
        });
      }
      setKeywordInput('');
    }
  };

  // Supprimer un mot-clé de la liste
  const removeKeyword = (keyword: string) => {
    setAIConfig({
      ...aiConfig,
      keywords: aiConfig.keywords.filter(k => k !== keyword)
    });
  };

  // Ajouter une phrase de non-disponibilité
  const addUnavailabilityKeyword = () => {
    const newKeyword = unavailabilityKeywordInput.trim();
    if (newKeyword) {
      const currentKeywords = Array.isArray(aiConfig.unavailabilityKeywords) ? aiConfig.unavailabilityKeywords : [];
      if (!currentKeywords.includes(newKeyword)) {
        setAIConfig({
          ...aiConfig,
          unavailabilityKeywords: [...currentKeywords, newKeyword]
        });
      }
      setUnavailabilityKeywordInput('');
    }
  };

  // Supprimer une phrase de non-disponibilité
  const removeUnavailabilityKeyword = (keywordToRemove: string) => {
    setAIConfig({
      ...aiConfig,
      unavailabilityKeywords: (aiConfig.unavailabilityKeywords || []).filter(k => k !== keywordToRemove)
    });
  };

  useEffect(() => {
    fetchAIConfig();
  }, []);

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Bot className="mr-2 h-5 w-5" />
          Configuration des réponses automatiques
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {updateSuccess && (
          <Alert className="mb-4 bg-green-100 border-green-500 text-green-700"> {/* Using custom styling for success */}
            <AlertTitle className="text-green-800">Succès</AlertTitle>
            <AlertDescription>Configuration IA enregistrée avec succès.</AlertDescription>
          </Alert>
        )}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="ai-enabled">Activer les réponses automatiques</Label>
              <p className="text-sm text-slate-500">
                Active ou désactive complètement les réponses automatiques
              </p>
            </div>
            <Switch
              id="ai-enabled"
              checked={aiConfig.enabled}
              onCheckedChange={(checked) => setAIConfig({...aiConfig, enabled: checked})}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="respond-all">Répondre à tous les messages</Label>
              <p className="text-sm text-slate-500">
                Si activé, répond à tous les messages sans vérifier les mots-clés
              </p>
            </div>
            <Switch
              id="respond-all"
              checked={aiConfig.respondToAll}
              onCheckedChange={(checked) => setAIConfig({...aiConfig, respondToAll: checked})}
              disabled={!aiConfig.enabled}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="system-prompt">Message système (instructions pour l'IA)</Label>
            <Textarea
              id="system-prompt"
              value={aiConfig.systemPrompt}
              onChange={(e) => setAIConfig({...aiConfig, systemPrompt: e.target.value})}
              placeholder="Vous êtes un assistant automobile amical et concis..."
              className="min-h-[100px]"
              disabled={!aiConfig.enabled}
            />
          </div>
          
          <div className="space-y-2 border-t pt-4 mt-4">
            <h3 className="font-medium">Délais de réponse</h3>
            <p className="text-sm text-slate-500 mb-4">
              Configurez les délais pour simuler un temps de réponse humain
            </p>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="typing-delays-enabled">Activer les délais de réponse</Label>
                <p className="text-sm text-slate-500">
                  Ajoute un délai avant l'envoi des réponses automatiques
                </p>
              </div>
              <Switch
                id="typing-delays-enabled"
                checked={aiConfig.typingDelays?.enabled || false}
                onCheckedChange={(checked) => {
                  const currentDelays = aiConfig.typingDelays || {
                    enabled: false, minDelay: 2000, maxDelay: 15000, wordsPerMinute: 40, randomizeDelay: true, showTypingIndicator: true
                  };
                  setAIConfig({ ...aiConfig, typingDelays: { ...currentDelays, enabled: checked }});
                }}
                disabled={!aiConfig.enabled}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div className="space-y-1">
                <Label htmlFor="min-delay">Délai minimum (secondes)</Label>
                <Input
                  id="min-delay"
                  type="number"
                  min="1"
                  max="30"
                  value={Math.round((aiConfig.typingDelays?.minDelay || 2000) / 1000)}
                  onChange={(e) => {
                    const currentDelays = aiConfig.typingDelays || { enabled: false, minDelay: 2000, maxDelay: 15000, wordsPerMinute: 40, randomizeDelay: true, showTypingIndicator: true };
                    setAIConfig({ ...aiConfig, typingDelays: { ...currentDelays, minDelay: parseInt(e.target.value) * 1000 }});
                  }}
                  disabled={!aiConfig.enabled || !(aiConfig.typingDelays?.enabled)}
                />
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="max-delay">Délai maximum (secondes)</Label>
                <Input
                  id="max-delay"
                  type="number"
                  min="5"
                  max="60"
                  value={Math.round((aiConfig.typingDelays?.maxDelay || 15000) / 1000)}
                  onChange={(e) => {
                    const currentDelays = aiConfig.typingDelays || { enabled: false, minDelay: 2000, maxDelay: 15000, wordsPerMinute: 40, randomizeDelay: true, showTypingIndicator: true };
                    setAIConfig({ ...aiConfig, typingDelays: { ...currentDelays, maxDelay: parseInt(e.target.value) * 1000 }});
                  }}
                  disabled={!aiConfig.enabled || !(aiConfig.typingDelays?.enabled)}
                />
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="words-per-minute">Vitesse de frappe (mots/min)</Label>
                <Input
                  id="words-per-minute"
                  type="number"
                  min="10"
                  max="100"
                  value={aiConfig.typingDelays?.wordsPerMinute || 40}
                  onChange={(e) => {
                    const currentDelays = aiConfig.typingDelays || { enabled: false, minDelay: 2000, maxDelay: 15000, wordsPerMinute: 40, randomizeDelay: true, showTypingIndicator: true };
                    setAIConfig({ ...aiConfig, typingDelays: { ...currentDelays, wordsPerMinute: parseInt(e.target.value) }});
                  }}
                  disabled={!aiConfig.enabled || !(aiConfig.typingDelays?.enabled)}
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-2">
              <div className="space-y-0.5">
                <Label htmlFor="randomize-delay">Ajouter un délai aléatoire</Label>
                <p className="text-sm text-slate-500">
                  Ajoute un délai aléatoire supplémentaire (0-30%)
                </p>
              </div>
              <Switch
                id="randomize-delay"
                checked={aiConfig.typingDelays?.randomizeDelay || false}
                onCheckedChange={(checked) => {
                  const currentDelays = aiConfig.typingDelays || { enabled: false, minDelay: 2000, maxDelay: 15000, wordsPerMinute: 40, randomizeDelay: true, showTypingIndicator: true };
                  setAIConfig({ ...aiConfig, typingDelays: { ...currentDelays, randomizeDelay: checked }});
                }}
                disabled={!aiConfig.enabled || !(aiConfig.typingDelays?.enabled)}
              />
            </div>
            
            <div className="flex items-center justify-between mt-2">
              <div className="space-y-0.5">
                <Label htmlFor="show-typing">Afficher "est en train d'écrire..."</Label>
                <p className="text-sm text-slate-500">
                  Affiche l'indicateur de frappe pendant le délai
                </p>
              </div>
              <Switch
                id="show-typing"
                checked={aiConfig.typingDelays?.showTypingIndicator || false}
                onCheckedChange={(checked) => {
                  const currentDelays = aiConfig.typingDelays || { enabled: false, minDelay: 2000, maxDelay: 15000, wordsPerMinute: 40, randomizeDelay: true, showTypingIndicator: true };
                  setAIConfig({ ...aiConfig, typingDelays: { ...currentDelays, showTypingIndicator: checked }});
                }}
                disabled={!aiConfig.enabled || !(aiConfig.typingDelays?.enabled)}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Mots-clés déclencheurs</Label>
            <p className="text-sm text-slate-500">
              Les messages contenant ces mots-clés recevront une réponse automatique
            </p>
            
            <div className="flex flex-wrap gap-2 mb-2">
              {aiConfig.keywords.map((keyword) => (
                <Badge key={keyword} className="flex items-center gap-1 bg-blue-100 text-blue-800">
                  {keyword}
                  <button
                    onClick={() => removeKeyword(keyword)}
                    className="text-blue-800 hover:text-blue-900"
                    disabled={!aiConfig.enabled || aiConfig.respondToAll}
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
            
            <div className="flex gap-2">
              <Input
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                placeholder="Nouveau mot-clé..."
                disabled={!aiConfig.enabled || aiConfig.respondToAll}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addKeyword(); }}}
              />
              <Button
                onClick={addKeyword}
                disabled={!keywordInput.trim() || !aiConfig.enabled || aiConfig.respondToAll}
              >
                Ajouter
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Phrases de non-disponibilité</Label>
            <p className="text-sm text-slate-500">
              Si un message entrant contient l'une de ces phrases (insensible à la casse et aux accents), l'IA ne répondra pas et le statut du véhicule sera mis à "vendu".
            </p>
            <div className="flex flex-wrap gap-2 mb-2">
              {(aiConfig.unavailabilityKeywords || []).map((phrase) => (
                <Badge key={phrase} className="flex items-center gap-1 bg-red-100 text-red-800">
                  {phrase}
                  <button
                    onClick={() => removeUnavailabilityKeyword(phrase)}
                    className="text-red-800 hover:text-red-900"
                    disabled={!aiConfig.enabled}
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={unavailabilityKeywordInput}
                onChange={(e) => setUnavailabilityKeywordInput(e.target.value)}
                placeholder="Nouvelle phrase (ex: déjà vendu)..."
                disabled={!aiConfig.enabled}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addUnavailabilityKeyword(); }}}
              />
              <Button
                onClick={addUnavailabilityKeyword}
                disabled={!unavailabilityKeywordInput.trim() || !aiConfig.enabled}
              >
                Ajouter
              </Button>
            </div>
          </div>
          
          <Button
            onClick={updateAIConfigHandler}
            className="w-full bg-green-600 hover:bg-green-700"
            disabled={updatingAIConfig}
          >
            {updatingAIConfig ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enregistrement...
              </>
            ) : (
              'Enregistrer la configuration'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AIConfigPanel;
