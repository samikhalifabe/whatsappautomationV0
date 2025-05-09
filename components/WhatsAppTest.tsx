"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const WhatsAppTest: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Vérifier le statut de la connexion WhatsApp
  const checkStatus = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:3001/api/whatsapp/status');
      setStatus(response.data);
      setError(null);
    } catch (err) {
      console.error('Erreur lors de la vérification du statut :', err);
      setError('Impossible de vérifier le statut WhatsApp');
    } finally {
      setLoading(false);
    }
  };

  // Récupérer les messages récents
  const fetchRecentMessages = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:3001/api/messages');
      setMessages(response.data || []);
      setError(null);
    } catch (err) {
      console.error('Erreur lors de la récupération des messages :', err);
      setError('Impossible de récupérer les messages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Au chargement du composant, vérifier le statut
    checkStatus();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-5">
      <h1 className="text-2xl font-bold mb-6">Test de récupération des messages WhatsApp</h1>
      
      <div className="mb-6 p-4 border border-gray-300 rounded-lg">
        <h2 className="text-xl font-semibold mb-3">Statut de la connexion</h2>
        {status ? (
          <div>
            <p>État: <strong>{status.status}</strong></p>
            {status.info && (
              <pre className="bg-gray-100 p-3 rounded-md mt-2 overflow-auto text-sm">
                {JSON.stringify(status.info, null, 2)}
              </pre>
            )}
          </div>
        ) : (
          <p>Chargement du statut...</p>
        )}
        <button 
          onClick={checkStatus}
          className="mt-4 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400"
          disabled={loading}
        >
          Vérifier le statut
        </button>
      </div>
      
      <div className="p-4 border border-gray-300 rounded-lg">
        <h2 className="text-xl font-semibold mb-3">Messages récents</h2>
        {error && (
          <div className="bg-red-100 text-red-800 p-3 rounded-md mb-4">
            {error}
          </div>
        )}
        
        <button 
          onClick={fetchRecentMessages}
          className="mb-4 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400"
          disabled={loading}
        >
          {loading ? 'Chargement...' : 'Récupérer les messages récents'}
        </button>
        
        {messages.length === 0 ? (
          <p>Aucun message trouvé ou cliquez sur le bouton pour charger les messages</p>
        ) : (
          <div>
            <p className="mb-2">Nombre de messages récupérés : {messages.length}</p>
            <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-md">
              {messages.map((msg, index) => (
                <div 
                  key={msg.id || index} 
                  className={`p-3 border-b border-gray-200 ${msg.is_from_me ? 'bg-green-50' : 'bg-gray-50'}`}
                >
                  <div className="text-xs text-gray-500 mb-1">
                    {msg.timestamp && new Date(msg.timestamp).toLocaleString()}
                    {msg.from && ` • De: ${msg.from}`}
                    {msg.is_from_me !== undefined && ` • ${msg.is_from_me ? 'Envoyé' : 'Reçu'}`}
                  </div>
                  <div className="break-words">
                    {msg.body || msg.message || msg.notes || JSON.stringify(msg)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WhatsAppTest;
