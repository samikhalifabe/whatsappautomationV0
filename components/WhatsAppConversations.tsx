"use client";

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, MessageCircle, Phone, Send, AlertCircle, Car, Info, ExternalLink, Calendar, Gauge, MapPin, Fuel, Euro, Settings, Bot } from "lucide-react";
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
  id: string;
  from: string;
  to: string;
  body: string;
  timestamp: number;
  isFromMe: boolean;
  chatName: string;
  chatId: string;
  conversation_id?: string; // Ajouté pour les messages WebSocket
  vehicle?: Vehicle | null; // Ajouté pour les messages WebSocket
  message_id?: string; // Ajouté pour les messages WebSocket
}

interface ChatGroup {
  chatId: string;
  chatName: string;
  messages: Message[];
  lastMessageTime: number;
  phoneNumber: string;
  rawPhoneNumbers: string[];
  vehicle?: Vehicle | null;
  debugInfo?: string;
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
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
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
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  
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
    unavailabilityKeywords: [] // Initialize as empty array
  });
  const [keywordInput, setKeywordInput] = useState<string>("");
  const [unavailabilityKeywordInput, setUnavailabilityKeywordInput] = useState<string>(""); // State for the single input field
  const [updatingAIConfig, setUpdatingAIConfig] = useState<boolean>(false);

  // Envoyer un message - mémorisé pour éviter les re-rendus inutiles
  const handleSendMessage = React.useCallback(async (text: string) => {
    if (!selectedChat || !text.trim()) return;

    const selectedChatData = conversations.find(c => c.chatId === selectedChat);
    if (!selectedChatData) return;

    setSendingMessage(true);
    setSendError(null);

    try {
      // Utiliser le véhicule déjà associé (peut être null)
      const matchingVehicle = selectedChatData.vehicle;

      // Utiliser le service d'envoi de message
      const result = await sendWhatsAppMessage(
        selectedChatData.phoneNumber,
        text,
        matchingVehicle, // Peut être null, le service doit gérer ce cas
        user?.id || '00000000-0000-0000-0000-000000000000'
      );

      if (result.success) {
        // Ajouter le message à la conversation
        const newMessage: Message = {
          id: result.messageId || Date.now().toString(),
          from: 'me',
          to: selectedChatData.phoneNumber,
          body: text,
          timestamp: Date.now() / 1000,
          isFromMe: true,
          chatName: selectedChatData.chatName,
          chatId: selectedChat
        };

        // Mettre à jour les conversations
        setConversations(prevConversations => 
          prevConversations.map(chat => 
            chat.chatId === selectedChat 
              ? {
                  ...chat, 
                  messages: [...chat.messages, newMessage],
                  lastMessageTime: newMessage.timestamp
                }
              : chat
          )
        );

        // La réinitialisation du champ est maintenant gérée dans le composant MessageInput
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
  }, [selectedChat, conversations, user]);

  // Mettre à jour les statuts de contact des véhicules
  const updateContactedVehicles = async () => {
    try {
      setUpdatingContacts(true);
      setUpdateSuccess(false);
      
      console.log('Mise à jour des véhicules contactés...');
      const response = await axios.get('http://localhost:3001/api/whatsapp/update-contacted-vehicles');
      console.log('Réponse mise à jour:', response.data);
      
      setUpdateSuccess(true);
      
      // Rafraîchir les conversations après la mise à jour
      await fetchConversations();
      
    } catch (err: any) {
      console.error('Erreur lors de la mise à jour des véhicules contactés:', err);
      setError(`Impossible de mettre à jour les véhicules contactés: ${err.message}`);
    } finally {
      setUpdatingContacts(false);
    }
  };

  // Récupérer toutes les conversations WhatsApp
  const fetchAllConversations = async () => {
    try {
      setLoadingAllConversations(true);
      setError(null);
      
      console.log('Récupération de toutes les conversations WhatsApp...');
      const response = await axios.get('http://localhost:3001/api/whatsapp/all-conversations');
      console.log('Réponse conversations complètes:', response.data);
      
      // Vérifier la structure des données reçues
      if (response.data && response.data.conversations && Array.isArray(response.data.conversations)) {
        // Convertir les conversations en format ChatGroup
        const allChatGroups: ChatGroup[] = response.data.conversations.map((conversation: any) => {
          // Extraire les numéros de téléphone
          const phoneNumbers = [
            conversation.contact.number
          ].filter(phone => phone && phone !== 'Inconnu' && phone !== 'me');
          
          // Normaliser les numéros de téléphone
          const normalizedPhones = phoneNumbers.map(normalizePhoneNumber);
          
          // Trouver le véhicule correspondant
          let matchingVehicle = null;
          let matchDebugInfo = '';
          
          // Parcourir tous les véhicules pour trouver une correspondance
          for (const vehicle of vehicles) {
            const vehicleNormalizedPhone = normalizePhoneNumber(vehicle.phone || '');
            
            if (normalizedPhones.includes(vehicleNormalizedPhone) && vehicleNormalizedPhone) {
              matchingVehicle = vehicle;
              matchDebugInfo = `Correspondance trouvée! Chat: ${normalizedPhones.join(', ')} | Véhicule: ${vehicleNormalizedPhone}`;
              break;
            }
          }
          
          if (!matchingVehicle) {
            matchDebugInfo = `Aucune correspondance trouvée pour les numéros: ${normalizedPhones.join(', ')}`;
          }

          return {
            chatId: conversation.chatId,
            chatName: conversation.chatName || conversation.contact.name || 'Chat sans nom',
            messages: conversation.messages.sort((a: Message, b: Message) => a.timestamp - b.timestamp),
            lastMessageTime: Math.max(...conversation.messages.map((m: Message) => m.timestamp)),
            phoneNumber: conversation.contact.number.includes('@c.us') ? conversation.contact.number : `${conversation.contact.number}@c.us`,
            rawPhoneNumbers: phoneNumbers,
            vehicle: matchingVehicle,
            debugInfo: `Numéros: ${phoneNumbers.join(', ')} | Normalisés: ${normalizedPhones.join(', ')} | ${matchDebugInfo}`
          };
        });
        
        // Trier les conversations par dernier message (plus récent en premier)
        allChatGroups.sort((a, b) => b.lastMessageTime - a.lastMessageTime);
        
        // Fusionner avec les conversations existantes au lieu de les remplacer
        setConversations(prevConversations => {
          // Créer une copie des conversations existantes
          const mergedConversations = [...prevConversations];
          
          // Pour chaque nouvelle conversation
          for (const newChat of allChatGroups) {
            // Vérifier si cette conversation existe déjà
            const existingIndex = mergedConversations.findIndex(c => c.chatId === newChat.chatId);
            
            if (existingIndex === -1) {
              // Si la conversation n'existe pas, l'ajouter
              mergedConversations.push(newChat);
            } else {
              // Si la conversation existe, fusionner les messages
              const existingChat = mergedConversations[existingIndex];
              
              // Créer un ensemble d'IDs de messages existants pour une recherche rapide
              const existingMessageIds = new Set(existingChat.messages.map(m => m.id));
              
              // Ajouter uniquement les nouveaux messages
              for (const msg of newChat.messages) {
                if (!existingMessageIds.has(msg.id)) {
                  existingChat.messages.push(msg);
                }
              }
              
              // Trier les messages par timestamp
              existingChat.messages.sort((a, b) => a.timestamp - b.timestamp);
              
              // Mettre à jour le dernier message
              if (existingChat.messages.length > 0) {
                existingChat.lastMessageTime = Math.max(
                  existingChat.lastMessageTime,
                  existingChat.messages[existingChat.messages.length - 1].timestamp
                );
              }
              
              // Mettre à jour dans le tableau
              mergedConversations[existingIndex] = existingChat;
            }
          }
          
          // Trier les conversations fusionnées par dernier message
          return mergedConversations.sort((a, b) => b.lastMessageTime - a.lastMessageTime);
        });
        
        setUpdateSuccess(true);
        
        // Sélectionner automatiquement la première conversation
        if (allChatGroups.length > 0 && !selectedChat) {
          setSelectedChat(allChatGroups[0].chatId);
        }
      } else {
        console.error('Format de données inattendu:', response.data);
        setError(`Format de données inattendu dans la réponse de l'API`);
      }
    } catch (err: any) {
      console.error('Erreur lors de la récupération de toutes les conversations:', err);
      setError(`Impossible de récupérer toutes les conversations: ${err.message}`);
    } finally {
      setLoadingAllConversations(false);
    }
  };

  // Récupérer les messages et les regrouper par conversation
  const fetchConversations = async () => {
    try {
      setLoading(true);
      console.log('Récupération des messages...');
      const response = await axios.get('http://localhost:3001/api/messages');
      console.log('Réponse messages:', response.data);
      
      // Regrouper les messages par chatId
      const messagesGroupedByChat: { [key: string]: Message[] } = {};
      
      response.data.forEach((msg: Message) => {
        const chatId = msg.chatId;
        if (!messagesGroupedByChat[chatId]) {
          messagesGroupedByChat[chatId] = [];
        }
        messagesGroupedByChat[chatId].push(msg);
      });
      
      // Créer les groupes de chat avec métadonnées
      const chatGroups: ChatGroup[] = Object.keys(messagesGroupedByChat).map(chatId => {
        const messages = messagesGroupedByChat[chatId];
        const firstMsg = messages[0]; // Supposons que les messages sont déjà triés
        
        // Extraire les numéros de téléphone
        const phoneNumbers = [
          firstMsg.from.replace('@c.us', ''),
          firstMsg.to.replace('@c.us', '')
        ].filter(phone => phone && phone !== 'Inconnu' && phone !== 'me');
        
        // Normaliser les numéros de téléphone
        const normalizedPhones = phoneNumbers.map(normalizePhoneNumber);
        
        // Trouver le véhicule correspondant
        let matchingVehicle = null;
        let matchDebugInfo = '';
        
        // Parcourir tous les véhicules pour trouver une correspondance
        for (const vehicle of vehicles) {
          const vehicleNormalizedPhone = normalizePhoneNumber(vehicle.phone || '');
          
          if (normalizedPhones.includes(vehicleNormalizedPhone) && vehicleNormalizedPhone) {
            matchingVehicle = vehicle;
            matchDebugInfo = `Correspondance trouvée! Chat: ${normalizedPhones.join(', ')} | Véhicule: ${vehicleNormalizedPhone}`;
            break;
          }
        }
        
        if (!matchingVehicle) {
          matchDebugInfo = `Aucune correspondance trouvée pour les numéros: ${normalizedPhones.join(', ')}`;
        }

        return {
          chatId: chatId,
          chatName: firstMsg.chatName || 'Chat sans nom',
          messages: messages.sort((a, b) => a.timestamp - b.timestamp), // Trier par date croissante
          lastMessageTime: Math.max(...messages.map(m => m.timestamp)),
          phoneNumber: firstMsg.from.includes('@c.us') ? firstMsg.from : 
                      (firstMsg.to && firstMsg.to.includes('@c.us') ? firstMsg.to : 'Inconnu'),
          rawPhoneNumbers: phoneNumbers,
          vehicle: matchingVehicle,
          debugInfo: `Numéros: ${phoneNumbers.join(', ')} | Normalisés: ${normalizedPhones.join(', ')} | ${matchDebugInfo}`
        };
      });
      
      // Trier les conversations par dernier message (plus récent en premier)
      chatGroups.sort((a, b) => b.lastMessageTime - a.lastMessageTime);
      
      // Fusionner avec les conversations existantes au lieu de les remplacer
      setConversations(prevConversations => {
        // Créer une copie des conversations existantes
        const mergedConversations = [...prevConversations];
        
        // Pour chaque nouvelle conversation
        for (const newChat of chatGroups) {
          // Vérifier si cette conversation existe déjà
          const existingIndex = mergedConversations.findIndex(c => c.chatId === newChat.chatId);
          
          if (existingIndex === -1) {
            // Si la conversation n'existe pas, l'ajouter
            mergedConversations.push(newChat);
          } else {
            // Si la conversation existe, fusionner les messages
            const existingChat = mergedConversations[existingIndex];
            
            // Créer un ensemble d'IDs de messages existants pour une recherche rapide
            const existingMessageIds = new Set(existingChat.messages.map(m => m.id));
            
            // Ajouter uniquement les nouveaux messages
            for (const msg of newChat.messages) {
              if (!existingMessageIds.has(msg.id)) {
                existingChat.messages.push(msg);
              }
            }
            
            // Trier les messages par timestamp
            existingChat.messages.sort((a, b) => a.timestamp - b.timestamp);
            
            // Mettre à jour le dernier message
            if (existingChat.messages.length > 0) {
              existingChat.lastMessageTime = Math.max(
                existingChat.lastMessageTime,
                existingChat.messages[existingChat.messages.length - 1].timestamp
              );
            }
            
            // Mettre à jour dans le tableau
            mergedConversations[existingIndex] = existingChat;
          }
        }
        
        // Trier les conversations fusionnées par dernier message
        return mergedConversations.sort((a, b) => b.lastMessageTime - a.lastMessageTime);
      });
      
      setError(null);
      
      // Sélectionner automatiquement la première conversation
      if (chatGroups.length > 0 && !selectedChat) {
        setSelectedChat(chatGroups[0].chatId);
      }
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
        // Convertir les conversations de la DB en format ChatGroup
        const dbChatGroups: ChatGroup[] = response.data.map((conv: any) => {
          // Extraire les messages
          const messages = conv.messages ? conv.messages.map((msg: any) => ({
            id: msg.message_id || msg.id,
            from: msg.is_from_me ? 'me' : conv.phoneNumber + '@c.us',
            to: msg.is_from_me ? conv.phoneNumber + '@c.us' : 'me',
            body: msg.body,
            timestamp: new Date(msg.timestamp).getTime() / 1000,
            isFromMe: msg.is_from_me,
            chatName: conv.vehicle?.brand + ' ' + conv.vehicle?.model || 'Chat sans nom',
            chatId: conv.chatId || conv.id
          })) : [];
          
          // Trouver le dernier message
          const lastMessageTime = messages.length > 0 
            ? Math.max(...messages.map((m: any) => m.timestamp))
            : new Date(conv.lastMessageAt).getTime() / 1000;
          
          return {
            chatId: conv.chatId || conv.id,
            chatName: conv.vehicle?.brand + ' ' + conv.vehicle?.model || 'Chat sans nom',
            messages: messages,
            lastMessageTime: lastMessageTime,
            phoneNumber: conv.phoneNumber + '@c.us',
            rawPhoneNumbers: [conv.phoneNumber],
            vehicle: conv.vehicle,
            debugInfo: `Conversation DB - ID: ${conv.id}, Phone: ${conv.phoneNumber}`
          };
        });
        
        // Trier les conversations par dernier message (plus récent en premier)
        dbChatGroups.sort((a, b) => b.lastMessageTime - a.lastMessageTime);
        
        setConversations(dbChatGroups);
        
        // Sélectionner automatiquement la première conversation
        if (dbChatGroups.length > 0 && !selectedChat) {
          setSelectedChat(dbChatGroups[0].chatId);
        }
      }
    } catch (err: any) {
      console.error('Erreur lors de la récupération des conversations DB:', err);
      setError(`Impossible de récupérer les conversations de la base de données: ${err.message}`);
    } finally {
      setLoadingDbConversations(false);
    }
  };

  // Initialiser la connexion WebSocket
  useEffect(() => {
    // Créer une nouvelle connexion socket si elle n'existe pas déjà
    if (!socketRef.current) {
      console.log('Initialisation de la connexion WebSocket...');
      
      // Créer une nouvelle connexion socket
      socketRef.current = io('http://localhost:3001');
      
      // Gérer la connexion
      socketRef.current.on('connect', () => {
        console.log('WebSocket connecté!');
        setSocketConnected(true);
      });
      
      // Gérer la déconnexion
      socketRef.current.on('disconnect', () => {
        console.log('WebSocket déconnecté!');
        setSocketConnected(false);
      });
      
      // Gérer les erreurs
      socketRef.current.on('connect_error', (error: any) => {
        console.error('Erreur de connexion WebSocket:', error);
        setSocketConnected(false);
      });
      
      // Gérer le message de bienvenue
      socketRef.current.on('welcome', (data: any) => {
        console.log('Message de bienvenue reçu:', data);
      });
      
      // Gérer les nouveaux messages
      socketRef.current.on('new_message', (message: Message) => {
        console.log('Nouveau message reçu via WebSocket:', message);
        console.log('Détails complets du message WebSocket:', JSON.stringify(message, null, 2));
        
        // Ajouter le message aux conversations existantes
        setConversations(prevConversations => {
          // Créer une copie des conversations existantes
          const updatedConversations = [...prevConversations];
          
          // Trouver la conversation correspondante avec une logique plus flexible
          console.log('Recherche de conversation pour le message:', message.id);
          console.log('Conversations disponibles:', updatedConversations.map(c => ({ 
            chatId: c.chatId, 
            phoneNumber: c.phoneNumber,
            rawPhoneNumbers: c.rawPhoneNumbers
          })));
          
          // Essayer plusieurs méthodes pour trouver la conversation correspondante
          let conversationIndex = updatedConversations.findIndex(c => c.chatId === message.chatId);
          
          // Si pas trouvé par chatId, essayer par conversation_id
          if (conversationIndex === -1 && message.conversation_id) {
            console.log('Tentative de correspondance par conversation_id:', message.conversation_id);
            conversationIndex = updatedConversations.findIndex(c => c.chatId === message.conversation_id);
          }
          
          // Si toujours pas trouvé, essayer par numéro de téléphone
          if (conversationIndex === -1) {
            const messagePhone = message.from !== 'me' ? message.from : message.to;
            console.log('Tentative de correspondance par numéro de téléphone:', messagePhone);
            conversationIndex = updatedConversations.findIndex(c => c.phoneNumber === messagePhone);
          }
          
          console.log('Résultat de la recherche de conversation:', conversationIndex);
          
          if (conversationIndex !== -1) {
            // Si la conversation existe, ajouter le message
            const conversation = updatedConversations[conversationIndex];
            
            // Vérifier si le message existe déjà
            const messageExists = conversation.messages.some(m => m.id === message.id);
            
            if (!messageExists) {
              console.log('Ajout du message à la conversation existante:', conversation.chatId);
              
              // Ajouter le message à la conversation
              conversation.messages.push(message);
              
              // Trier les messages par timestamp
              conversation.messages.sort((a, b) => a.timestamp - b.timestamp);
              
              // Mettre à jour le dernier message
              conversation.lastMessageTime = Math.max(
                conversation.lastMessageTime,
                message.timestamp
              );
              
              // Mettre à jour la conversation dans le tableau
              updatedConversations[conversationIndex] = conversation;
              
              // Afficher une notification si ce n'est pas la conversation sélectionnée
              if (conversation.chatId !== selectedChat) {
                setNewMessageNotification(true);
                // Jouer un son de notification (optionnel)
                try {
                  const audio = new Audio('/notification.mp3');
                  audio.play().catch(e => console.log('Erreur lors de la lecture du son:', e));
                } catch (e) {
                  console.log('Erreur lors de la création du son:', e);
                }
              }
            } else {
              console.log('Message déjà existant dans la conversation, ignoré');
            }
          } else {
            // Si la conversation n'existe pas, créer une nouvelle conversation
            console.log('Aucune conversation trouvée, création d\'une nouvelle conversation');
            
            // Déterminer le numéro de téléphone et le nom de la conversation
            const phoneNumber = message.from !== 'me' ? message.from : message.to;
            let chatName = message.chatName || 'Nouvelle conversation';
            
            // Si le message contient des informations sur le véhicule, utiliser ces informations
            if (message.vehicle) {
              chatName = `${message.vehicle.brand} ${message.vehicle.model}`;
            }
            
            console.log('Création d\'une nouvelle conversation avec:', {
              chatId: message.chatId || message.conversation_id || phoneNumber,
              chatName,
              phoneNumber
            });
            
            // Créer une nouvelle conversation
            const newConversation: ChatGroup = {
              chatId: message.chatId || message.conversation_id || phoneNumber,
              chatName,
              messages: [message],
              lastMessageTime: message.timestamp,
              phoneNumber,
              rawPhoneNumbers: [phoneNumber.replace('@c.us', '')],
              vehicle: message.vehicle || null,
              debugInfo: `Conversation créée automatiquement via WebSocket - Message ID: ${message.id}`
            };
            
            // Ajouter la nouvelle conversation
            updatedConversations.push(newConversation);
            console.log('Nouvelle conversation ajoutée:', newConversation.chatId);
            
            // Afficher une notification
            setNewMessageNotification(true);
            // Jouer un son de notification (optionnel)
            try {
              const audio = new Audio('/notification.mp3');
              audio.play().catch(e => console.log('Erreur lors de la lecture du son:', e));
            } catch (e) {
              console.log('Erreur lors de la création du son:', e);
            }
          }
          
          // Trier les conversations par dernier message (plus récent en premier)
          return updatedConversations.sort((a, b) => b.lastMessageTime - a.lastMessageTime);
        });
      });
    }
    
    // Nettoyer la connexion socket lors du démontage du composant
    return () => {
      if (socketRef.current) {
        console.log('Fermeture de la connexion WebSocket...');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [selectedChat]); // Dépendance à selectedChat pour mettre à jour les notifications

  // Memoize the selected conversation messages to prevent unnecessary re-renders
  const selectedConversationMessages = React.useMemo(() => {
    const selectedChatData = conversations.find(c => c.chatId === selectedChat);
    return selectedChatData?.messages || [];
  }, [conversations, selectedChat]);
  
  // Récupérer la configuration de l'IA
  const fetchAIConfig = async () => {
    try {
      const response = await axios.get<{ success: boolean, config: AIConfig & { unavailabilityKeywords?: string[] } }>('http://localhost:3001/api/whatsapp/ai-config');
      if (response.data.success && response.data.config) {
        const fetchedConfig = response.data.config;
        // Ensure typingDelays exists with defaults if missing
        const sanitizedDelays = fetchedConfig.typingDelays || {
          enabled: false, minDelay: 2000, maxDelay: 15000, wordsPerMinute: 40, randomizeDelay: true, showTypingIndicator: true
        };
        setAIConfig({
          ...fetchedConfig,
          typingDelays: sanitizedDelays,
          // Ensure unavailabilityKeywords is an array, default to empty if missing
          unavailabilityKeywords: Array.isArray(fetchedConfig.unavailabilityKeywords) ? fetchedConfig.unavailabilityKeywords : [] 
        });
        // No longer need to join/set for textarea
        // setUnavailabilityKeywordInput(
        //  Array.isArray(fetchedConfig.unavailabilityKeywords) ? fetchedConfig.unavailabilityKeywords.join('\n') : ''
        // );
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
      
      // Payload now directly uses the array from aiConfig state
      const payload = {
        ...aiConfig,
        // unavailabilityKeywords is already an array in aiConfig state
      };
      
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
      // Ensure unavailabilityKeywords exists and is an array before adding
      const currentKeywords = Array.isArray(aiConfig.unavailabilityKeywords) ? aiConfig.unavailabilityKeywords : [];
      if (!currentKeywords.includes(newKeyword)) {
        setAIConfig({
          ...aiConfig,
          unavailabilityKeywords: [...currentKeywords, newKeyword]
        });
      }
      setUnavailabilityKeywordInput(''); // Clear input field
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
    // Charger d'abord les conversations de la DB, puis les conversations récentes
    fetchDbConversations();
    
    // Charger la configuration de l'IA
    fetchAIConfig();
    
    // Désactivation du rafraîchissement automatique pour éviter les plantages
    // const interval = setInterval(fetchConversations, 30000);
    // return () => clearInterval(interval);
  }, []);

  // Formatage de la date
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    
    // Si c'est aujourd'hui, afficher uniquement l'heure
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Sinon, afficher la date et l'heure
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
        
        {/* Indicateur de connexion WebSocket */}
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
                        key={chat.chatId}
                        className={`p-4 border-b cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors
                          ${selectedChat === chat.chatId ? 'bg-slate-100 dark:bg-slate-800' : ''}`}
                        onClick={() => {
                          setSelectedChat(chat.chatId);
                          setNewMessageNotification(false); // Effacer la notification lors de la sélection
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
                                  <div className="text-slate-600 flex items-center">
                                    <Gauge className="h-3 w-3 mr-1" />
                                    {chat.vehicle.mileage.toLocaleString()} km
                                  </div>
                                  <div className="text-slate-600 flex items-center">
                                    <Fuel className="h-3 w-3 mr-1" />
                                    {chat.vehicle.fuel_type}
                                  </div>
                                  <div className="text-slate-600 flex items-center col-span-2 truncate">
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
                                    className="text-blue-500 hover:text-blue-700 text-xs flex items-center mt-2"
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
                            {formatDate(chat.lastMessageTime)}
                          </div>
                        </div>
                        {/* Last message - Even more prominent */}
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 line-clamp-2 mt-2 border-t pt-2 border-slate-200 dark:border-slate-700 clear-both">
                          {chat.messages.length > 0 ? (
                            <>
                              <span className="font-bold">{chat.messages[chat.messages.length - 1].isFromMe ? 'Vous: ' : ''}</span>
                              {chat.messages[chat.messages.length - 1].body}
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
            {selectedChat ? (
              <Card className="h-full flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>
                        {conversations.find(c => c.chatId === selectedChat)?.chatName || 'Conversation'}
                      </CardTitle>
                      <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center">
                        <Phone className="h-3 w-3 mr-1" />
                        {(() => {
                          const chat = conversations.find(c => c.chatId === selectedChat);
                          if (!chat) return '';
                          
                          return chat.vehicle 
                            ? formatPhoneNumber(chat.vehicle.phone || chat.phoneNumber) 
                            : formatPhoneNumber(chat.phoneNumber || '');
                        })()}
                      </div>
                    </div>
                    
                    {/* Vehicle Details in Header */}
                    {(() => {
                      const chat = conversations.find(c => c.chatId === selectedChat);
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
                    const chat = conversations.find(c => c.chatId === selectedChat);
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
                    {/* Afficher seulement les 50 derniers messages pour améliorer les performances */}
                    {selectedConversationMessages.slice(-50).map((msg) => (
                      <MessageItem 
                        key={msg.id} 
                        message={msg} 
                        formatDate={formatDate} 
                      />
                    ))}
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
