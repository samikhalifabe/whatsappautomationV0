"use client";

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Loader2, MessageCircle, Car, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import { useWhatsApp } from "./WhatsAppContext";
import { useVehicles } from "@/hooks/useVehicles"; // Assuming this hook is still needed for the update button
import { useConversations } from "@/hooks/useConversations";
import { useMessages } from "@/hooks/useMessages";
import { useWebSocket } from "@/hooks/useWebSocket";
import AIConfigPanel from "@/components/ai-config/AIConfigPanel"; // Import the AI config panel
import { ConversationsList, ConversationDetail } from "@/components/conversations"; // Import components from index

// Define types locally for now, to be centralized later
// These types should match the ones defined in the hooks and components
interface AppMessage {
  id: string;
  from: string;
  to: string;
  body: string;
  timestamp: number;
  isFromMe: boolean;
  chatName: string;
  chatId: string;
  conversation_id?: string;
  vehicle?: any | null; // Use 'any' or import the specific Vehicle type if needed here
  message_id?: string;
}
interface ChatGroup {
  id: string; // Conversation UUID
  chatId: string;
  chatName: string;
  messages: AppMessage[];
  lastMessageTime: number;
  phoneNumber: string;
  rawPhoneNumbers: string[];
  vehicle?: any | null; // Use 'any' or import the specific Vehicle type if needed here
  debugInfo?: string;
  lastMessage?: AppMessage | null;
  state?: string;
}


const WhatsAppConversations: React.FC = () => {
  const { user } = useAuth();
  const { status: whatsAppStatus } = useWhatsApp(); // Renamed to avoid conflict

  // Use the new hooks
  const {
    conversations,
    loadingDbConversations,
    error,
    selectedConversation,
    selectedConversationUUID,
    updatingConversationState,
    newMessageNotification,
    fetchDbConversations,
    handleSelectConversation,
    handleConversationStateChange,
    updateConversationOnNewMessage,
    setNewMessageNotification,
    setError // Expose setError from hook
  } = useConversations();

  const {
    messagesForSelectedChat,
    loadingMessages,
    sendingMessage,
    sendError,
    fetchMessagesForChat,
    handleSendMessage,
    addIncomingMessage,
  } = useMessages(selectedConversation, updateConversationOnNewMessage); // Pass selectedConversation and callback

  const { socketConnected } = useWebSocket({ onNewMessage: addIncomingMessage }); // Pass callback to add incoming messages

  // State for UI toggles
  const [showDebugInfo, setShowDebugInfo] = useState<boolean>(false);
  const [showAIConfig, setShowAIConfig] = useState<boolean>(false);

  // State for specific actions not yet in hooks
  const [updatingContacts, setUpdatingContacts] = useState<boolean>(false);
  const [updateSuccess, setUpdateSuccess] = useState<boolean>(false);
  const [loadingAllConversations, setLoadingAllConversations] = useState<boolean>(false);
  const [loadingRecentConversations, setLoadingRecentConversations] = useState<boolean>(false); // Renamed from 'loading'

  // Mettre à jour les statuts de contact des véhicules (still in container for now)
  const updateContactedVehicles = async () => {
    try {
      setUpdatingContacts(true);
      setUpdateSuccess(false);
      setError(null); // Clear previous errors
      console.log('Mise à jour des véhicules contactés...');
      await axios.get('http://localhost:3001/api/whatsapp/update-contacted-vehicles');
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 3000); // Hide success message after 3 seconds
      await fetchDbConversations(); // Refresh DB conversations after update
    } catch (err: any) {
      console.error('Erreur lors de la mise à jour des véhicules contactés:', err);
      setError(`Impossible de mettre à jour les véhicules contactés: ${err.message}`);
    } finally {
      setUpdatingContacts(false);
    }
  };

  // Récupérer toutes les conversations WhatsApp (from WhatsApp Web - still in container for now)
  const fetchAllConversations = async () => {
    try {
      setLoadingAllConversations(true);
      setError(null); // Clear previous errors
      console.log('Récupération de toutes les conversations WhatsApp...');
      await axios.get('http://localhost:3001/api/whatsapp/all-conversations');
      // Assuming the backend saves to DB, refresh from DB
      await fetchDbConversations();
    } catch (err: any) {
      console.error('Erreur lors de la récupération de toutes les conversations:', err);
      setError(`Impossible de récupérer toutes les conversations: ${err.message}`);
    } finally {
      setLoadingAllConversations(false);
    }
  };

  // Récupérer les messages et les regrouper par conversation (from WhatsApp Web - limited fetch - still in container for now)
  const fetchRecentConversations = async () => { // Renamed from fetchConversations
    try {
      setLoadingRecentConversations(true);
      setError(null); // Clear previous errors
      console.log('Récupération des messages (limited fetch)...');
      await axios.get('http://localhost:3001/api/messages');
      // Assuming the backend saves to DB, refresh from DB
      await fetchDbConversations();
    } catch (err: any) {
      console.error('Erreur lors de la récupération des messages :', err);
      setError(`Impossible de récupérer les messages: ${err.message}`);
    } finally {
      setLoadingRecentConversations(false);
    }
  };

  // Formatage de la date (can be moved to a utility or hook)
  const formatDate = useCallback((timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, []);

  // Formatter le numéro de téléphone (can be moved to a utility or hook)
  const formatPhoneNumber = useCallback((phoneNumber: string) => {
    return phoneNumber.replace('@c.us', '');
  }, []);


  // Effect to fetch messages when selected conversation changes
  useEffect(() => {
    if (selectedConversationUUID) {
      fetchMessagesForChat(selectedConversationUUID);
    }
  }, [selectedConversationUUID, fetchMessagesForChat]);


  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Conversations WhatsApp</h1>
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-2 ${socketConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm text-slate-500">
            {socketConnected ? 'WebSocket connecté' : 'WebSocket déconnecté'}
          </span>
          {newMessageNotification && (
            <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              Nouveau message
            </span>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between items-center mb-6">
        <div className="flex space-x-2">
          <Button
            onClick={fetchRecentConversations}
            disabled={loadingRecentConversations}
          >
            {loadingRecentConversations ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Chargement...
              </>
            ) : (
              'Actualiser les conversations récentes'
            )}
          </Button>

          <Button
            onClick={fetchAllConversations}
            disabled={loadingAllConversations}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            {loadingAllConversations ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Récupération complète...
              </>
            ) : (
              <>
                <MessageCircle className="mr-2 h-4 w-4" />
                Récupérer toutes les conversations
              </>
            )}
          </Button>

          <Button
            onClick={fetchDbConversations}
            disabled={loadingDbConversations}
            className="bg-purple-500 hover:bg-purple-600 text-white"
          >
            {loadingDbConversations ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Chargement DB...
              </>
            ) : (
              <>
                <MessageCircle className="mr-2 h-4 w-4" />
                Charger conversations DB
              </>
            )}
          </Button>

          <Button
            onClick={updateContactedVehicles}
            disabled={updatingContacts}
            className="bg-[#25D366] hover:bg-[#128C7E] text-white"
          >
            {updatingContacts ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Mise à jour...
              </>
            ) : (
              <>
                <Car className="mr-2 h-4 w-4" />
                Mettre à jour les véhicules contactés
              </>
            )}
          </Button>

          <Button
            onClick={() => setShowAIConfig(!showAIConfig)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Bot className="mr-2 h-4 w-4" />
            {showAIConfig ? 'Masquer Config IA' : 'Config IA'}
          </Button>
        </div>

        <Button
          variant="outline"
          onClick={() => setShowDebugInfo(!showDebugInfo)}
        >
          {showDebugInfo ? 'Masquer le débogage' : 'Afficher le débogage'}
        </Button>
      </div>

      {/* Panneau de configuration de l'IA */}
      {showAIConfig && <AIConfigPanel />}

      {updateSuccess && (
        <Alert className="mb-4 bg-green-50 border-green-200">
          <div className="flex items-center">
            <div className="bg-green-100 p-1 rounded-full">
              <Car className="h-4 w-4 text-green-600" />
            </div>
            <AlertTitle className="ml-2 text-green-800">Mise à jour réussie</AlertTitle>
          </div>
          <AlertDescription className="text-green-700">
            Les statuts de contact des véhicules ont été mis à jour avec succès.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <ConversationsList
            conversations={conversations}
            selectedConversationUUID={selectedConversationUUID}
            onSelectConversation={handleSelectConversation}
            formatDate={formatDate}
            formatPhoneNumber={formatPhoneNumber}
            showDebugInfo={showDebugInfo}
            loading={loadingDbConversations} // Use loadingDbConversations for the list
          />
        </div>

        <div className="md:col-span-2">
          <ConversationDetail
            selectedConversation={selectedConversation}
            messagesForSelectedChat={messagesForSelectedChat}
            loadingMessages={loadingMessages}
            onSendMessage={handleSendMessage}
            sendingMessage={sendingMessage}
            sendError={sendError}
            whatsAppStatus={whatsAppStatus}
            onStateChange={handleConversationStateChange}
            updatingConversationState={updatingConversationState}
            formatDate={formatDate}
            formatPhoneNumber={formatPhoneNumber}
          />
        </div>
      </div>
    </div>
  );
};

export default WhatsAppConversations;
