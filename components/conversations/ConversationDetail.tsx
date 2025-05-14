"use client";

import React from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MessageCircle, AlertCircle } from "lucide-react";

import ConversationHeader from './ConversationHeader';
import MessageList from './MessageList';
import MessageInput from './MessageInput'; // Already created

import { AppMessage } from "../../types/messages";
import { ChatGroup } from "../../types/conversations";
import { Vehicle } from "../../types/vehicles";

interface ConversationDetailProps {
  selectedConversation: ChatGroup | null | undefined;
  messagesForSelectedChat: AppMessage[];
  loadingMessages: boolean;
  onSendMessage: (text: string) => void;
  sendingMessage: boolean;
  sendError: string | null;
  whatsAppStatus: string; // e.g., 'connected', 'disconnected'
  onStateChange: (newState: string) => void;
  updatingConversationState: boolean;
  formatDate: (timestamp: number) => string;
  formatPhoneNumber: (phone: string) => string;
}

const ConversationDetail: React.FC<ConversationDetailProps> = ({
  selectedConversation,
  messagesForSelectedChat,
  loadingMessages,
  onSendMessage,
  sendingMessage,
  sendError,
  whatsAppStatus,
  onStateChange,
  updatingConversationState,
  formatDate,
  formatPhoneNumber,
}) => {
  if (!selectedConversation) {
    return (
      <Card className="h-full flex items-center justify-center">
        <CardContent>
          <div className="text-center text-slate-500 dark:text-slate-400">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Sélectionnez une conversation pour afficher les messages</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <ConversationHeader
          selectedConversation={selectedConversation}
          onStateChange={onStateChange}
          updatingConversationState={updatingConversationState}
          formatPhoneNumber={formatPhoneNumber}
        />
      </CardHeader>
      <CardContent className="flex-grow overflow-y-auto pt-0 flex flex-col">
        <MessageList
          messages={messagesForSelectedChat}
          loadingMessages={loadingMessages}
          formatDate={formatDate}
        />

        {whatsAppStatus !== 'connected' && (
          <Alert variant="destructive" className="mb-2 mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>WhatsApp non connecté</AlertTitle>
            <AlertDescription>
              Veuillez vous connecter à WhatsApp avant d'envoyer des messages.
            </AlertDescription>
          </Alert>
        )}

        {sendError && (
          <Alert variant="destructive" className="mb-2 mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erreur d'envoi</AlertTitle>
            <AlertDescription>{sendError}</AlertDescription>
          </Alert>
        )}

        <MessageInput
          initialValue="" // Or pass existing draft if available
          onSend={onSendMessage}
          disabled={whatsAppStatus !== 'connected' || sendingMessage}
          sending={sendingMessage}
        />
      </CardContent>
    </Card>
  );
};

export default ConversationDetail;
