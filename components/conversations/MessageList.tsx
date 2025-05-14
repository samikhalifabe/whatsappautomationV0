"use client";

import React, { useEffect, useRef } from 'react';
import MessageItem from './MessageItem'; // Import the new component
import { AppMessage } from "../../types/messages";
import { Vehicle } from "../../types/vehicles";

interface MessageListProps {
  messages: AppMessage[];
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
