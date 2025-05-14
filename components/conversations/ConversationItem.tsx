"use client";

import React from 'react';
import { Phone } from "lucide-react";
import VehicleDetails from './VehicleDetails'; // Using the new component
import type { Database } from "@/types/supabase";

// Define types locally for now, to be centralized later
type Vehicle = Database["public"]["Tables"]["vehicles"]["Row"];
interface Message {
  id: string;
  body: string;
  timestamp: number;
  isFromMe: boolean;
  // Other fields if necessary for display
}
interface ChatGroup {
  id: string;
  chatId: string;
  chatName: string;
  messages: Message[]; // Though not directly used for rendering list item, part of the type
  lastMessageTime: number;
  phoneNumber: string;
  rawPhoneNumbers: string[];
  vehicle?: Vehicle | null;
  debugInfo?: string;
  lastMessage?: Message | null;
  state?: string;
}

interface ConversationItemProps {
  chat: ChatGroup;
  isSelected: boolean;
  onSelect: (chatId: string, conversationUUID: string) => void;
  formatDate: (timestamp: number) => string;
  formatPhoneNumber: (phone: string) => string;
  showDebugInfo?: boolean;
}

const ConversationItem: React.FC<ConversationItemProps> = ({
  chat,
  isSelected,
  onSelect,
  formatDate,
  formatPhoneNumber,
  showDebugInfo = false,
}) => {
  return (
    <div
      className={`p-4 border-b cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors
        ${isSelected ? 'bg-slate-100 dark:bg-slate-800' : ''}`}
      onClick={() => onSelect(chat.chatId, chat.id)}
    >
      <div className="flex justify-between items-start">
        <div className="flex-grow">
          <h3 className="font-medium">{chat.chatName}</h3>
          <div className="flex items-center text-xs text-slate-500 dark:text-slate-400">
            <Phone className="h-3 w-3 mr-1" />
            {formatPhoneNumber(chat.vehicle?.phone || chat.phoneNumber)}
          </div>
          <VehicleDetails vehicle={chat.vehicle} layout="compact" />
          {showDebugInfo && chat.debugInfo && (
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
      {chat.lastMessage && (
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 line-clamp-2 mt-2 border-t pt-2 border-slate-200 dark:border-slate-700 clear-both">
          <span className="font-bold">{chat.lastMessage.isFromMe ? 'Vous: ' : ''}</span>
          {chat.lastMessage.body}
        </p>
      )}
    </div>
  );
};

export default ConversationItem;
