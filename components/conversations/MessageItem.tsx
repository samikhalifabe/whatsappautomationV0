"use client";

import React from 'react';

import { Message } from "../../types/messages";

interface MessageItemProps {
  message: Message;
  formatDate: (timestamp: number) => string;
}

const MessageItem = React.memo(({ message, formatDate }: MessageItemProps) => {
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
            <span className="ml-1">✓</span> // This could be dynamic based on message status
          )}
        </div>
      </div>
    </div>
  );
});

MessageItem.displayName = 'MessageItem';

export default MessageItem;
