"use client";

import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Database } from "@/types/supabase"; // Assuming global Supabase types

// Define types locally for now, to be centralized later
type Vehicle = Database["public"]["Tables"]["vehicles"]["Row"];
interface AppMessage { // Renamed to avoid conflict with Message from lucide-react
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

interface UseWebSocketOptions {
  onNewMessage: (message: AppMessage) => void;
  socketUrl?: string;
}

export const useWebSocket = ({ onNewMessage, socketUrl = 'http://localhost:3001' }: UseWebSocketOptions) => {
  const [socketConnected, setSocketConnected] = useState<boolean>(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!socketRef.current) {
      console.log('Initializing WebSocket connection...');
      socketRef.current = io(socketUrl);

      socketRef.current.on('connect', () => {
        console.log('WebSocket connected!');
        setSocketConnected(true);
      });

      socketRef.current.on('disconnect', () => {
        console.log('WebSocket disconnected!');
        setSocketConnected(false);
      });

      socketRef.current.on('connect_error', (error: any) => {
        console.error('WebSocket connection error:', error);
        setSocketConnected(false);
      });

      socketRef.current.on('welcome', (data: any) => {
        console.log('Welcome message received:', data);
      });

      socketRef.current.on('new_message', (message: AppMessage) => {
        console.log('New message received via WebSocket:', message);
        onNewMessage(message);
      });
    }

    return () => {
      if (socketRef.current) {
        console.log('Closing WebSocket connection...');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [onNewMessage, socketUrl]);

  return { socketConnected, socket: socketRef.current };
};
