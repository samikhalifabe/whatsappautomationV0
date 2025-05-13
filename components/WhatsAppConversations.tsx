"use client";

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, MessageCircle, Phone, Send, AlertCircle, Car, Info, ExternalLink, Calendar, Gauge, MapPin, Fuel, Euro, Settings, Bot, ChevronDown } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { sendWhatsAppMessage } from "@/services/messageService";
import { useWhatsApp } from "./WhatsAppContext";
import { useVehicles } from "@/hooks/useVehicles";
import type { Database } from "@/types/supabase";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Vehicle = Database["public"]["Tables"]["vehicles"]["Row"]

// Interface pour la configuration de l'IA
interface AIConfig {
  enabled: boolean;
  respondToAll: boolean;
  keywords: string[];
  systemPrompt: string;
  typingDelays?: {
    enabled: boolean;
    minDelay: number;       // Délai minimum en millisecondes
    maxDelay: number;       // Délai maximum en millisecondes
    wordsPerMinute: number; // Vitesse de frappe simulée
    randomizeDelay: boolean; // Ajouter un délai aléatoire supplémentaire
    showTypingIndicator: boolean; // Afficher l'indicateur "est en train d'écrire..."
  };
  unavailabilityKeywords?: string[]; // Added for unavailability phrases
}

// Simplified phone number normalization
const normalizePhoneNumber = (phone: string | null): string => {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
};

interface Message {
  id: string; // This should be the unique ID of the message itself (e.g., from DB or WhatsApp)
  from: string;
  to: string;
  body: string;
  timestamp: number;
  isFromMe: boolean;
  chatName: string;
  chatId: string; // This is the identifier for the chat (e.g., phone number for individual, group ID for group)
  conversation_id?: string; // UUID of the conversation in the DB
  vehicle?: Vehicle | null; 
  message_id?: string; // Original message ID from WhatsApp
}

interface ChatGroup {
  id: string; // UUID of the conversation from the DB
  chatId: string; // Identifier for the chat (e.g., phone number for individual, group ID for group)
  chatName: string;
  messages: Message[]; // This will store messages for the selected chat, fetched separately
  lastMessageTime: number;
  phoneNumber: string; // The primary phone number associated with the chat
  rawPhoneNumbers: string[];
  vehicle?: Vehicle | null;
  debugInfo?: string;
  lastMessage?: Message | null; 
}

// Composant isolé pour le champ de saisie de texte utilisant useRef pour éviter les re-rendus
const MessageInput = React.memo(({
  initialValue,
  onSend,
  disabled,
  sending
}: {
  initialValue: string,
  onSend: (text: string) => void,
  disabled: boolean,
  sending: boolean
}) => {
  // Utiliser useRef au lieu de useState pour éviter les re-rendus pendant la saisie
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const textValueRef = useRef(initialValue);
  
  // Mettre à jour la référence sans déclencher de re-rendu
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    textValueRef.current = e.target.value;
  };
  
  // Fonction pour envoyer le message en utilisant la valeur actuelle du ref
  const handleSend = () => {
    if (textValueRef.current.trim() && !disabled && !sending) {
      onSend(textValueRef.current);
      // Vider le champ après envoi
      if (inputRef.current) {
        inputRef.current.value = '';
      }
      textValueRef.current = '';
    }
  };
  
  // Gérer l'envoi avec la touche Entrée (avec Shift+Entrée pour nouvelle ligne)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  return (
    <div className="mt-auto flex items-center space-x-2">
      <textarea
        ref={inputRef}
        defaultValue={initialValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Saisissez votre message..."
        className="flex-grow border rounded p-2 resize-none h-[80px]"
        disabled={disabled}
      />
      <Button 
        onClick={handleSend}
        disabled={disabled || sending}
        className="bg-[#25D366] hover:bg-[#128C7E] text-white"
      >
        {sending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Send className="mr-2 h-4 w-4" />
        )}
      </Button>
    </div>
  );
});

MessageInput.displayName = 'MessageInput';

// Memoized message component to prevent unnecessary re-renders
const MessageItem = React.memo(({ 
  message, 
  formatDate 
}: { 
  message: Message, 
  formatDate: (timestamp: number) => string 
}) => {
  return (
    <div 
      className={`flex ${message.isFromMe ? 'justify-end' : 'justify-start'}`}
    >
      <div 
        className={`max-w-[80%] px-4 py-2 rounded-lg
          ${message.isFromMe 
            ? 'bg-green-500 text-white rounded-tr-none' 
            : 'bg-slate-200 dark:bg-slate-700 rounded-tl-none'}`}
      >
        <p className="break-words">{message.body}</p>
        <div className="text-xs mt-1 text-right opacity-70">
          {formatDate(message.timestamp)}
          {message.isFromMe && (
            <span className="ml-1">✓</span>
          )}
        </div>
      </div>
    </div>
  );
});

MessageItem.displayName = 'MessageItem';

const WhatsAppConversations: React.FC = () => {
  const { user } = useAuth();
  const { status } = useWhatsApp();
  const { vehicles } = useVehicles();
  
  const [conversations, setConversations] = useState<ChatGroup[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null); 
  const [selectedConversationUUID, setSelectedConversationUUID] = useState<string | null>(null); 
  const [messagesForSelectedChat, setMessagesForSelectedChat] = useState<Message[]>([]); 
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false); 
  const [updatingConversationState, setUpdatingConversationState] = useState<boolean>(false); // New state for state update loading
  
  // Message sending state with debounced update
  const [messageText, setMessageText] = useState<string>('');
  const [sendingMessage, setSendingMessage] = useState<boolean>(false);
  const [sendError, setSendError] = useState<string | null>(null);
  
  // Mise à jour directe du texte pour assurer la réactivité
  const handleMessageTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageText(e.target.value);
  };
  
  // Debug state
  const [showDebugInfo, setShowDebugInfo] = useState<boolean>(false);
  const [updatingContacts, setUpdatingContacts] = useState<boolean>(false);
  const [updateSuccess, setUpdateSuccess] = useState<boolean>(false);
  const [loadingAllConversations, setLoadingAllConversations] = useState<boolean>(false);
  const [loadingDbConversations, setLoadingDbConversations] = useState<boolean>(false);
  
  // WebSocket state
  const [socketConnected, setSocketConnected] = useState<boolean>(false);
  const socketRef = useRef<Socket | null>(null);
  const [newMessageNotification, setNewMessageNotification] = useState<boolean>(false);
  
  // AI Configuration state
  const [showAIConfig, setShowAIConfig] = useState<boolean>(false);
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

  // Envoyer un message - mémorisé pour éviter les re-rendus inutiles
  const handleSendMessage = React.useCallback(async (text: string) => {
    if (!selectedConversationUUID || !text.trim()) return;

    const selectedChatData = conversations.find(c => c.id === selectedConversationUUID);
    if (!selectedChatData) return;

    setSendingMessage(true);
    setSendError(null);

    try {
      const matchingVehicle = selectedChatData.vehicle;
      const result = await sendWhatsAppMessage(
        selectedChatData.phoneNumber,
        text,
        matchingVehicle, 
        user?.id || '00000000-0000-0000-0000-000000000000'
      );

      if (result.success) {
        const newMessage: Message = {
          id: result.messageId || Date.now().toString(),
          from: 'me',
          to: selectedChatData.phoneNumber,
          body: text,
          timestamp: Date.now() / 1000,
          isFromMe: true,
          chatName: selectedChatData.chatName,
          chatId: selectedChatData.chatId,
          conversation_id: result.conversationId 
        };
        setMessagesForSelectedChat(prevMessages => [...prevMessages, newMessage]);
        setConversations(prevConversations =>
          prevConversations.map(chat =>
            chat.id === selectedConversationUUID
              ? {
                  ...chat,
                  lastMessageTime: newMessage.timestamp,
                  lastMessage: newMessage 
                }
              : chat
          ).sort((a, b) => b.lastMessageTime - a.lastMessageTime)
        );
      } else {
        console.error('Échec de l\'envoi du message:', result.error);
        setSendError(result.error || 'Échec de l\'envoi du message');
      }
    } catch (err: any) {
      console.error('Erreur lors de l\'envoi du message:', err);
      setSendError(err.message || 'Erreur lors de l\'envoi du message');
    } finally {
      setSendingMessage(false);
    }
  }, [selectedConversationUUID, conversations, user]);

  // Mettre à jour les statuts de contact des véhicules
  const updateContactedVehicles = async () => {
    try {
      setUpdatingContacts(true);
      setUpdateSuccess(false);
      console.log('Mise à jour des véhicules contactés...');
      await axios.get('http://localhost:3001/api/whatsapp/update-contacted-vehicles');
      setUpdateSuccess(true);
      await fetchDbConversations(); // Refresh DB conversations after update
    } catch (err: any) {
      console.error('Erreur lors de la mise à jour des véhicules contactés:', err);
      setError(`Impossible de mettre à jour les véhicules contactés: ${err.message}`);
    } finally {
      setUpdatingContacts(false);
    }
  };

  // Récupérer toutes les conversations WhatsApp (from WhatsApp Web)
  const fetchAllConversations = async () => {
    // This function seems to fetch from WhatsApp Web and then save to DB.
    // It might be better to call fetchDbConversations after this to ensure UI consistency.
    try {
      setLoadingAllConversations(true);
      setError(null);
      console.log('Récupération de toutes les conversations WhatsApp...');
      await axios.get('http://localhost:3001/api/whatsapp/all-conversations');
      setUpdateSuccess(true); // Assuming success if no error
      await fetchDbConversations(); // Refresh from DB after fetching all from WhatsApp
    } catch (err: any) {
      console.error('Erreur lors de la récupération de toutes les conversations:', err);
      setError(`Impossible de récupérer toutes les conversations: ${err.message}`);
    } finally {
      setLoadingAllConversations(false);
    }
  };

  // Récupérer les messages et les regrouper par conversation (from WhatsApp Web - limited fetch)
  const fetchConversations = async () => {
    // This function fetches recent messages from WhatsApp Web.
    // It might be better to call fetchDbConversations after this to ensure UI consistency.
    try {
      setLoading(true);
      setError(null); 
      console.log('Récupération des messages (limited fetch)...');
      await axios.get('http://localhost:3001/api/messages');
      await fetchDbConversations(); // Refresh from DB after fetching recent from WhatsApp
    } catch (err: any) {
      console.error('Erreur lors de la récupération des messages :', err);
      setError(`Impossible de récupérer les messages: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Récupérer les conversations depuis la base de données Supabase
  const fetchDbConversations = async () => {
    try {
      setLoadingDbConversations(true);
      setError(null);
      console.log('Récupération des conversations depuis Supabase...');
      const response = await axios.get('http://localhost:3001/api/conversations');
      console.log('Réponse conversations DB:', response.data);
      
      if (response.data && Array.isArray(response.data)) {
        const dbChatGroups: ChatGroup[] = response.data.map((conv: any) => ({
          id: conv.id, // This is the UUID
          chatId: conv.chatId || conv.id, // Fallback to UUID if chatId is missing
          chatName: conv.vehicle?.brand + ' ' + conv.vehicle?.model || conv.phoneNumber || 'Chat sans nom',
          messages: [], // Messages will be fetched on selection
          lastMessageTime: conv.lastMessage ? new Date(conv.lastMessage.timestamp).getTime() / 1000 : new Date(conv.lastMessageAt).getTime() / 1000,
          phoneNumber: conv.phoneNumber.includes('@c.us') ? conv.phoneNumber : `${conv.phoneNumber}@c.us`,
          rawPhoneNumbers: [conv.phoneNumber],
          vehicle: conv.vehicle,
          lastMessage: conv.lastMessage,
          debugInfo: `Conversation DB - ID: ${conv.id}, Phone: ${conv.phoneNumber}, State: ${conv.state}`
        }));
        
        dbChatGroups.sort((a, b) => b.lastMessageTime - a.lastMessageTime);
        setConversations(dbChatGroups);
        
        if (dbChatGroups.length > 0 && !selectedConversationUUID) {
          setSelectedChatId(dbChatGroups[0].chatId);
          setSelectedConversationUUID(dbChatGroups[0].id);
        }
      }
    } catch (err: any) {
      console.error('Erreur lors de la récupération des conversations DB:', err);
      setError(`Impossible de récupérer les conversations de la base de données: ${err.message}`);
    } finally {
      setLoadingDbConversations(false);
    }
  };

  // Fetch messages for the selected chat
  const fetchMessagesForSelectedChat = async (conversationUUID: string) => {
    if (!conversationUUID) {
      setMessagesForSelectedChat([]);
      return;
    }
    
    setLoadingMessages(true);
    setSendError(null); 
    
    try {
      console.log(`Fetching messages for conversation UUID: ${conversationUUID}`);
      const response = await axios.get(`http://localhost:3001/api/conversations/${conversationUUID}`);
      console.log(`Data received from /api/conversations/${conversationUUID}:`, response.data); 
      
      if (response.data && response.data.messages && Array.isArray(response.data.messages)) {
        const fetchedMessages: Message[] = response.data.messages.map((msg: any) => ({
          id: msg.message_id || msg.id,
          from: msg.is_from_me ? 'me' : response.data.phoneNumber + '@c.us', 
          to: msg.is_from_me ? response.data.phoneNumber + '@c.us' : 'me',
          body: msg.body,
          timestamp: new Date(msg.timestamp).getTime() / 1000,
          isFromMe: msg.is_from_me,
          chatName: response.data.vehicle?.brand + ' ' + response.data.vehicle?.model || 'Chat sans nom', 
          chatId: response.data.chatId || response.data.id, 
          conversation_id: response.data.id,
          vehicle: response.data.vehicle
        }));
        
        fetchedMessages.sort((a, b) => a.timestamp - b.timestamp);
        setMessagesForSelectedChat(fetchedMessages);
      } else {
        console.error(`Failed to fetch messages for chat ${conversationUUID} or invalid format:`, response.data);
        setMessagesForSelectedChat([]);
      }
    } catch (err: any) {
      console.error(`Error fetching messages for chat ${conversationUUID}:`, err);
      setMessagesForSelectedChat([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Initialiser la connexion WebSocket
  useEffect(() => {
    if (!socketRef.current) {
      console.log('Initialisation de la connexion WebSocket...');
      socketRef.current = io('http://localhost:3001');
      
      socketRef.current.on('connect', () => {
        console.log('WebSocket connecté!');
        setSocketConnected(true);
      });
      
      socketRef.current.on('disconnect', () => {
        console.log('WebSocket déconnecté!');
        setSocketConnected(false);
      });
      
      socketRef.current.on('connect_error', (error: any) => {
        console.error('Erreur de connexion WebSocket:', error);
        setSocketConnected(false);
      });
      
      socketRef.current.on('welcome', (data: any) => {
        console.log('Message de bienvenue reçu:', data);
      });
      
      socketRef.current.on('new_message', (message: Message) => {
        console.log('Nouveau message reçu via WebSocket:', message);
        
        setConversations(prevConversations => {
          const updatedConversations = [...prevConversations];
          let conversationIndex = updatedConversations.findIndex(c => c.id === message.conversation_id);

          if (conversationIndex === -1) { // Fallback if conversation_id is not matching, try chatId
             conversationIndex = updatedConversations.findIndex(c => c.chatId === message.chatId);
          }

          if (conversationIndex !== -1) {
            const conversation = updatedConversations[conversationIndex];
            const messageExists = conversation.messages.some(m => m.id === message.id || m.message_id === message.message_id);
            
            if (!messageExists) {
              conversation.messages.push(message);
              conversation.messages.sort((a, b) => a.timestamp - b.timestamp);
              conversation.lastMessageTime = message.timestamp;
              conversation.lastMessage = message; // Update last message object
              updatedConversations[conversationIndex] = conversation;

              if (selectedConversationUUID === conversation.id) {
                setMessagesForSelectedChat(prev => [...prev, message].sort((a,b) => a.timestamp - b.timestamp));
              } else {
                setNewMessageNotification(true);
                try {
                  const audio = new Audio('/notification.mp3');
                  audio.play().catch(e => console.log('Erreur lors de la lecture du son:', e));
                } catch (e) {
                  console.log('Erreur lors de la création du son:', e);
                }
              }
            }
          } else {
            // Create new conversation if it doesn't exist
            const phoneNumber = message.from !== 'me' ? message.from : message.to;
            let chatName = message.chatName || 'Nouvelle conversation';
            if (message.vehicle) {
              chatName = `${message.vehicle.brand} ${message.vehicle.model}`;
            }
            const newConversation: ChatGroup = {
              id: message.conversation_id || message.chatId, // Use conversation_id if available
              chatId: message.chatId || message.conversation_id || phoneNumber,
              chatName,
              messages: [message],
              lastMessageTime: message.timestamp,
              phoneNumber,
              rawPhoneNumbers: [phoneNumber.replace('@c.us', '')],
              vehicle: message.vehicle || null,
              lastMessage: message,
              debugInfo: `Conversation créée via WebSocket - Msg ID: ${message.id}`
            };
            updatedConversations.push(newConversation);
            setNewMessageNotification(true);
          }
          return updatedConversations.sort((a, b) => b.lastMessageTime - a.lastMessageTime);
        });
      });
    }
    
    return () => {
      if (socketRef.current) {
        console.log('Fermeture de la connexion WebSocket...');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [selectedConversationUUID]); 

  // Fetch messages for the selected chat when selectedConversationUUID changes
  useEffect(() => {
    if (selectedConversationUUID) {
      fetchMessagesForSelectedChat(selectedConversationUUID);
    } else {
      setMessagesForSelectedChat([]); 
    }
  }, [selectedConversationUUID]); 
  
  // Récupérer la configuration de l'IA
  const fetchAIConfig = async () => {
    try {
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
  const updateAIConfig = async () => {
    try {
      setUpdatingAIConfig(true);
      const payload = { ...aiConfig };
      console.log("Sending AI Config Payload:", payload);
      const response = await axios.post('http://localhost:3001/api/whatsapp/ai-config', payload);
      
      if (response.data.success) {
        setUpdateSuccess(true);
        setTimeout(() => setUpdateSuccess(false), 3000);
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
    fetchDbConversations();
    fetchAIConfig();
  }, []);

  // Formatage de la date
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Formatter le numéro de téléphone
  const formatPhoneNumber = (phoneNumber: string) => {
    return phoneNumber.replace('@c.us', '');
  };

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
        <div className="bg-red-100 text-red-800 p-3 rounded-md mb-4">
          {error}
        </div>
      )}
      
      <div className="flex justify-between items-center mb-6">
        <div className="flex space-x-2">
          <Button 
            onClick={fetchConversations}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Chargement...
              </>
            ) : (
              'Actualiser les conversations'
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
      {showAIConfig && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bot className="mr-2 h-5 w-5" />
              Configuration des réponses automatiques
            </CardTitle>
          </CardHeader>
          <CardContent>
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
                        enabled: false,
                        minDelay: 2000,
                        maxDelay: 15000,
                        wordsPerMinute: 40,
                        randomizeDelay: true,
                        showTypingIndicator: true
                      };
                      
                      setAIConfig({
                        ...aiConfig, 
                        typingDelays: {
                          ...currentDelays,
                          enabled: checked
                        }
                      });
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
                        const currentDelays = aiConfig.typingDelays || {
                          enabled: false,
                          minDelay: 2000,
                          maxDelay: 15000,
                          wordsPerMinute: 40,
                          randomizeDelay: true,
                          showTypingIndicator: true
                        };
                        
                        setAIConfig({
                          ...aiConfig,
                          typingDelays: {
                            ...currentDelays,
                            minDelay: parseInt(e.target.value) * 1000
                          }
                        });
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
                        const currentDelays = aiConfig.typingDelays || {
                          enabled: false,
                          minDelay: 2000,
                          maxDelay: 15000,
                          wordsPerMinute: 40,
                          randomizeDelay: true,
                          showTypingIndicator: true
                        };
                        
                        setAIConfig({
                          ...aiConfig,
                          typingDelays: {
                            ...currentDelays,
                            maxDelay: parseInt(e.target.value) * 1000
                          }
                        });
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
                        const currentDelays = aiConfig.typingDelays || {
                          enabled: false,
                          minDelay: 2000,
                          maxDelay: 15000,
                          wordsPerMinute: 40,
                          randomizeDelay: true,
                          showTypingIndicator: true
                        };
                        
                        setAIConfig({
                          ...aiConfig,
                          typingDelays: {
                            ...currentDelays,
                            wordsPerMinute: parseInt(e.target.value)
                          }
                        });
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
                      const currentDelays = aiConfig.typingDelays || {
                        enabled: false,
                        minDelay: 2000,
                        maxDelay: 15000,
                        wordsPerMinute: 40,
                        randomizeDelay: true,
                        showTypingIndicator: true
                      };
                      
                      setAIConfig({
                        ...aiConfig, 
                        typingDelays: {
                          ...currentDelays,
                          randomizeDelay: checked
                        }
                      });
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
                      const currentDelays = aiConfig.typingDelays || {
                        enabled: false,
                        minDelay: 2000,
                        maxDelay: 15000,
                        wordsPerMinute: 40,
                        randomizeDelay: true,
                        showTypingIndicator: true
                      };
                      
                      setAIConfig({
                        ...aiConfig, 
                        typingDelays: {
                          ...currentDelays,
                          showTypingIndicator: checked
                        }
                      });
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
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addKeyword();
                      }
                    }}
                  />
                  <Button 
                    onClick={addKeyword}
                    disabled={!keywordInput.trim() || !aiConfig.enabled || aiConfig.respondToAll}
                  >
                    Ajouter
                  </Button>
                </div>
              </div>

              {/* Tag-style input for Unavailability Keywords */}
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
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addUnavailabilityKeyword();
                      }
                    }}
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
                onClick={updateAIConfig}
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
      )}
      
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
      
      {conversations.length === 0 ? (
        <p className="text-slate-500">
          {loading || loadingAllConversations ? 'Chargement des conversations...' : 'Aucune conversation trouvée.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Contacts</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[600px] overflow-y-auto">
                  {conversations.map((chat) => (
                      <div 
                        key={chat.id} // Use conversation UUID as key
                        className={`p-4 border-b cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors
                          ${selectedConversationUUID === chat.id ? 'bg-slate-100 dark:bg-slate-800' : ''}`}
                        onClick={() => {
                          setSelectedChatId(chat.chatId); // Keep this for display if needed
                          setSelectedConversationUUID(chat.id); // Set the UUID for fetching
                          setNewMessageNotification(false); 
                        }}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-grow">
                            <h3 className="font-medium">{chat.chatName}</h3>
                            <div className="flex items-center text-xs text-slate-500 dark:text-slate-400">
                              <Phone className="h-3 w-3 mr-1" />
                              {chat.vehicle ? formatPhoneNumber(chat.vehicle.phone || chat.phoneNumber) : formatPhoneNumber(chat.phoneNumber)}
                            </div>
                            {chat.vehicle ? (
                              <div className="mt-2">
                                {/* Vehicle Image - Even smaller size */}
                                {chat.vehicle.image_url && (
                                  <div className="mb-2 relative float-right ml-2">
                                    <img 
                                      src={chat.vehicle.image_url} 
                                      alt={`${chat.vehicle.brand} ${chat.vehicle.model}`}
                                      className="w-16 h-16 object-cover rounded-md"
                                    />
                                    <div className="absolute bottom-0 right-0 bg-black bg-opacity-70 text-white px-1 py-0.5 text-xs rounded-tl-md">
                                      <Euro className="h-3 w-3 inline-block mr-0.5" />
                                      {chat.vehicle.price.toLocaleString()} €
                                    </div>
                                  </div>
                                )}
                                
                                {/* Vehicle Details */}
                                <div className="grid grid-cols-2 gap-1 text-xs">
                                  <div className="text-green-600 flex items-center">
                                    <Car className="h-3 w-3 mr-1" />
                                    {chat.vehicle.brand} {chat.vehicle.model}
                                  </div>
                                  <div className="text-slate-600 flex items-center">
                                    <Calendar className="h-3 w-3 mr-1" />
                                    {chat.vehicle.year}
                                  </div>
                                  <div className="flex items-center">
                                    <Gauge className="h-3 w-3 mr-1" />
                                    <span>{chat.vehicle.mileage.toLocaleString()} km</span>
                                  </div>
                                  <div className="flex items-center">
                                    <Fuel className="h-3 w-3 mr-1" />
                                    <span>{chat.vehicle.fuel_type}</span>
                                  </div>
                                  <div className="flex items-center col-span-2 truncate">
                                    <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                                    <span className="truncate">{chat.vehicle.location}</span>
                                  </div>
                                </div>
                                
                                {/* Listing URL */}
                                {chat.vehicle.listing_url && (
                                  <a 
                                    href={chat.vehicle.listing_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-500 hover:text-blue-700 text-xs flex items-center"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <ExternalLink className="h-3 w-3 mr-1" />
                                    Voir l'annonce
                                  </a>
                                )}
                              </div>
                            ) : (
                              <div className="text-xs text-red-500 mt-1">
                                <Info className="h-3 w-3 inline-block mr-1" />
                                Aucun véhicule associé
                              </div>
                            )}
                            {showDebugInfo && (
                              <div className="text-xs text-slate-400 mt-1 break-all">
                                <div className="font-bold">Debug:</div>
                                {chat.debugInfo}
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 ml-2 flex-shrink-0">
                            {chat.lastMessage ? formatDate(chat.lastMessage.timestamp) : formatDate(chat.lastMessageTime)}
                          </div>
                        </div>
                        {/* Last message - Even more prominent */}
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 line-clamp-2 mt-2 border-t pt-2 border-slate-200 dark:border-slate-700 clear-both">
                          {chat.lastMessage ? (
                            <>
                              <span className="font-bold">{chat.lastMessage.isFromMe ? 'Vous: ' : ''}</span>
                              {chat.lastMessage.body}
                            </>
                          ) : ""}
                        </p>
                      </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="md:col-span-2">
            {selectedConversationUUID ? ( // Use selectedConversationUUID to determine if a chat is selected
              <Card className="h-full flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>
                        {conversations.find(c => c.id === selectedConversationUUID)?.chatName || 'Conversation'}
                      </CardTitle>
                      <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center">
                        <Phone className="h-3 w-3 mr-1" />
                        {(() => {
                          const chat = conversations.find(c => c.id === selectedConversationUUID);
                          if (!chat) return '';
                          
                          return chat.vehicle 
                            ? formatPhoneNumber(chat.vehicle.phone || chat.phoneNumber) 
                            : formatPhoneNumber(chat.phoneNumber || '');
                        })()}
                      </div>
                    </div>
                    
                    {/* Conversation State Selector */}
                    {selectedConversationUUID && (
                      <div className="flex items-center space-x-2">
                        <Label htmlFor="conversation-state" className="text-sm">État:</Label>
                        <Select 
                          value={conversations.find(c => c.id === selectedConversationUUID)?.state || 'active'}
                          onValueChange={handleStateChange}
                          disabled={updatingConversationState}
                        >
                          <SelectTrigger id="conversation-state" className="w-[150px]">
                            <SelectValue placeholder="Sélectionner état" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="negotiation">Négociation</SelectItem>
                            <SelectItem value="completed">Terminée</SelectItem>
                            <SelectItem value="archived">Archivée</SelectItem>
                          </SelectContent>
                        </Select>
                        {updatingConversationState && <Loader2 className="h-4 w-4 animate-spin" />}
                      </div>
                    )}

                    {/* Vehicle Details in Header */}
                    {(() => {
                      const chat = conversations.find(c => c.id === selectedConversationUUID);
                      if (!chat || !chat.vehicle) return null;
                      
                      return (
                        <div className="flex items-center">
                          {chat.vehicle.image_url && (
                            <img 
                              src={chat.vehicle.image_url} 
                              alt={`${chat.vehicle.brand} ${chat.vehicle.model}`}
                              className="w-12 h-12 object-cover rounded-md mr-2"
                            />
                          )}
                          <div>
                            <div className="text-sm font-medium">
                              {chat.vehicle.price.toLocaleString()} €
                            </div>
                            {chat.vehicle.listing_url && (
                              <a 
                                href={chat.vehicle.listing_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:text-blue-700 text-xs flex items-center"
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                Voir l'annonce
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  
                  {/* Extended Vehicle Info */}
                  {(() => {
                    const chat = conversations.find(c => c.id === selectedConversationUUID);
                    if (!chat || !chat.vehicle) return null;
                    
                    return (
                      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                        <div className="grid grid-cols-4 gap-2 text-xs">
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            <span>{chat.vehicle.year}</span>
                          </div>
                          <div className="flex items-center">
                            <Gauge className="h-3 w-3 mr-1" />
                            <span>{chat.vehicle.mileage.toLocaleString()} km</span>
                          </div>
                          <div className="flex items-center">
                            <Fuel className="h-3 w-3 mr-1" />
                            <span>{chat.vehicle.fuel_type}</span>
                          </div>
                          <div className="flex items-center">
                            <Car className="h-3 w-3 mr-1" />
                            <span>{chat.vehicle.transmission}</span>
                          </div>
                          <div className="flex items-center col-span-4">
                            <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                            <span className="truncate">{chat.vehicle.location}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </CardHeader>
                <CardContent className="flex-grow overflow-y-auto pt-0 flex flex-col">
                  <div className="flex flex-col space-y-3 pb-3 flex-grow">
                    {/* Display messages for the selected chat */}
                    {loadingMessages ? (
                      <div className="text-center text-muted-foreground">Chargement des messages...</div>
                    ) : messagesForSelectedChat.length > 0 ? (
                      messagesForSelectedChat.map((msg) => (
                        <MessageItem 
                          key={msg.id} 
                          message={msg} 
                          formatDate={formatDate} 
                        />
                      ))
                    ) : (
                      <div className="text-center text-muted-foreground">Aucun message dans cette conversation.</div>
                    )}
                  </div>
                  
                  {status !== 'connected' && (
                    <Alert variant="destructive" className="mb-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>WhatsApp non connecté</AlertTitle>
                      <AlertDescription>
                        Veuillez vous connecter à WhatsApp avant d'envoyer des messages.
                      </AlertDescription>
                    </Alert>
                  )}

                  {sendError && (
                    <Alert variant="destructive" className="mb-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Erreur d'envoi</AlertTitle>
                      <AlertDescription>{sendError}</AlertDescription>
                    </Alert>
                  )}

                  <MessageInput
                    initialValue=""
                    onSend={handleSendMessage}
                    disabled={status !== 'connected'}
                    sending={sendingMessage}
                  />
                </CardContent>
              </Card>
            ) : (
              <Card className="h-full flex items-center justify-center">
                <CardContent>
                  <div className="text-center text-slate-500 dark:text-slate-400">
                    <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Sélectionnez une conversation pour afficher les messages</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WhatsAppConversations;

// Function to update conversation state via API
const updateConversationState = async (conversationId: string, newState: string) => {
  try {
    console.log(`Attempting to update conversation ${conversationId} state to ${newState}`);
    const response = await axios.patch(`http://localhost:3001/api/conversations/${conversationId}/state`, { state: newState });
    console(`Conversation state updated successfully:`, response.data);
    return response.data.success;
  } catch (error: any) {
    console.error(`Error updating conversation ${conversationId} state to ${newState}:`, error);
    return false;
  }
};
