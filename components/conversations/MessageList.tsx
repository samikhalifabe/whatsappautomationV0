"use client";

import React, { useEffect, useRef } from 'react';
import MessageItem from './MessageItem'; // Import the new component
import type { Database } from "@/types/supabase"; // Assuming global Supabase types

// Define types locally for now, to be centralized later
type Vehicle = Database["public"]["Tables"]["vehicles"]["Row"];
interface Message {
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

interface MessageListProps {
  messages: Message[];
  loadingMessages: boolean;
  formatDate: (timestamp: number) => string;
}

const MessageList: React.FC<MessageListProps> = ({ messages, loadingMessages, formatDate }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]); // Scroll to bottom when messages change

  if (loadingMessages) {
    return <div className="text-center text-muted-foreground flex-grow flex items-center justify-center">Chargement des messages...</div>;
  }

  if (messages.length === 0) {
    return <div className="text-center text-muted-foreground flex-grow flex items-center justify-center">Aucun message dans cette conversation.</div>;
  }

  return (
    <div className="flex flex-col space-y-3 pb-3 flex-grow overflow-y-auto">
      {messages.map((msg) => (
        <MessageItem
          key={msg.id} // Ensure unique key, might need to combine with message_id if id is not unique enough
          message={msg}
          formatDate={formatDate}
        />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
