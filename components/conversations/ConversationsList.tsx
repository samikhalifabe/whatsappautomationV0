"use client";

import React from 'react';
import ConversationItem from './ConversationItem'; // Import the new component
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Message } from "../../types/messages";
import { ChatGroup } from "../../types/conversations";
import { Vehicle } from "../../types/vehicles";

interface ConversationsListProps {
  conversations: ChatGroup[];
  selectedConversationUUID: string | null;
  onSelectConversation: (chatId: string, conversationUUID: string) => void;
  formatDate: (timestamp: number) => string;
  formatPhoneNumber: (phone: string) => string;
  showDebugInfo?: boolean;
  loading: boolean; // To show loading state for the list
}

const ConversationsList: React.FC<ConversationsListProps> = ({
  conversations,
  selectedConversationUUID,
  onSelectConversation,
  formatDate,
  formatPhoneNumber,
  showDebugInfo = false,
  loading,
}) => {
  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Contacts</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[600px] overflow-y-auto flex items-center justify-center text-slate-500">
            Chargement des conversations...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (conversations.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Contacts</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[600px] overflow-y-auto flex items-center justify-center text-slate-500">
            Aucune conversation trouvée.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Contacts</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[600px] overflow-y-auto">
          {conversations.map((chat) => (
            <ConversationItem
              key={chat.id}
              chat={chat}
              isSelected={selectedConversationUUID === chat.id}
              onSelect={onSelectConversation}
              formatDate={formatDate}
              formatPhoneNumber={formatPhoneNumber}
              showDebugInfo={showDebugInfo}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ConversationsList;
