"use client";

import React, { useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea"; // Assuming Textarea is also used, as per original structure
import { Loader2, Send } from "lucide-react";

interface MessageInputProps {
  initialValue: string;
  onSend: (text: string) => void;
  disabled: boolean;
  sending: boolean;
}

const MessageInput = React.memo(({
  initialValue,
  onSend,
  disabled,
  sending
}: MessageInputProps) => {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const textValueRef = useRef(initialValue);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    textValueRef.current = e.target.value;
  };

  const handleSend = () => {
    if (textValueRef.current.trim() && !disabled && !sending) {
      onSend(textValueRef.current);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
      textValueRef.current = '';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="mt-auto flex items-center space-x-2">
      <Textarea // Changed from textarea to Textarea component
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

export default MessageInput;
