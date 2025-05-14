"use client";

import { useState, useCallback } from 'react';
import axios from 'axios';
import { sendWhatsAppMessage } from '@/services/messageService';
import type { Database } from "@/types/supabase";
import { useAuth } from "@/hooks/useAuth"; // To get user ID

// Define types locally for now, to be centralized later
type Vehicle = Database["public"]["Tables"]["vehicles"]["Row"];
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
  vehicle?: Vehicle | null;
  message_id?: string;
}
interface ChatGroup { // For context on selected chat
  id: string; // Conversation UUID
  chatId: string;
  chatName: string;
  phoneNumber: string;
  vehicle?: Vehicle | null;
}

export const useMessages = (
    selectedConversation: ChatGroup | null | undefined,
    onMessageSentOrReceived: (newMessage: AppMessage, conversationId: string) => void // Callback to update global conversations
) => {
  const { user } = useAuth();
  const [messagesForSelectedChat, setMessagesForSelectedChat] = useState<AppMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [sendingMessage, setSendingMessage] = useState<boolean>(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const fetchMessagesForChat = useCallback(async (conversationUUID: string) => {
    if (!conversationUUID) {
      setMessagesForSelectedChat([]);
      return;
    }
    setLoadingMessages(true);
    setSendError(null);
    try {
      const response = await axios.get(`http://localhost:3001/api/conversations/${conversationUUID}`);
      if (response.data && response.data.messages && Array.isArray(response.data.messages)) {
        const fetchedMessages: AppMessage[] = response.data.messages.map((msg: any) => ({
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
        setMessagesForSelectedChat([]);
      }
    } catch (err: any) {
      console.error(`Error fetching messages for chat ${conversationUUID}:`, err);
      setMessagesForSelectedChat([]);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const handleSendMessage = useCallback(async (text: string) => {
    if (!selectedConversation || !text.trim() || !user) return;

    setSendingMessage(true);
    setSendError(null);

    try {
      const result = await sendWhatsAppMessage(
        selectedConversation.phoneNumber,
        text,
        selectedConversation.vehicle,
        user.id
      );

      if (result.success) {
        const newMessage: AppMessage = {
          id: result.messageId || Date.now().toString(), // Use DB message ID if available
          from: 'me',
          to: selectedConversation.phoneNumber,
          body: text,
          timestamp: Date.now() / 1000, // Consider using server timestamp if possible
          isFromMe: true,
          chatName: selectedConversation.chatName,
          chatId: selectedConversation.chatId,
          conversation_id: result.conversationId || selectedConversation.id,
          vehicle: selectedConversation.vehicle,
          message_id: result.messageId // Original WhatsApp message ID
        };
        setMessagesForSelectedChat(prevMessages => [...prevMessages, newMessage].sort((a,b) => a.timestamp - b.timestamp));
        if (newMessage.conversation_id) {
            onMessageSentOrReceived(newMessage, newMessage.conversation_id);
        }
      } else {
        setSendError(result.error || 'Échec de l\'envoi du message');
      }
    } catch (err: any) {
      setSendError(err.message || 'Erreur lors de l\'envoi du message');
    } finally {
      setSendingMessage(false);
    }
  }, [selectedConversation, user, onMessageSentOrReceived]);
  
  // Function to add a new message received via WebSocket
  const addIncomingMessage = useCallback((message: AppMessage) => {
    if (selectedConversation && message.conversation_id === selectedConversation.id) {
      setMessagesForSelectedChat(prev => {
        // Avoid duplicates
        if (prev.some(m => m.id === message.id || (m.message_id && m.message_id === message.message_id))) {
          return prev;
        }
        return [...prev, message].sort((a, b) => a.timestamp - b.timestamp);
      });
    }
  }, [selectedConversation]);


  return {
    messagesForSelectedChat,
    loadingMessages,
    sendingMessage,
    sendError,
    fetchMessagesForChat,
    handleSendMessage,
    addIncomingMessage,
    setMessagesForSelectedChat // Expose setter if direct manipulation is needed from parent
  };
};
