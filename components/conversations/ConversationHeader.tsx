"use client";

import React from 'react';
import { CardTitle } from "@/components/ui/card";
import { Phone, Loader2, ExternalLink } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import VehicleDetails from './VehicleDetails'; // Import the new component
import { Message } from "../../types/messages";
import { ChatGroup } from "../../types/conversations";
import { Vehicle } from "../../types/vehicles";

interface ConversationHeaderProps {
  selectedConversation: ChatGroup | null | undefined;
  onStateChange: (newState: string) => void;
  updatingConversationState: boolean;
  formatPhoneNumber: (phone: string) => string; // Pass formatter as prop
}

const ConversationHeader: React.FC<ConversationHeaderProps> = ({
  selectedConversation,
  onStateChange,
  updatingConversationState,
  formatPhoneNumber
}) => {
  if (!selectedConversation) {
    return null; // Or a placeholder
  }

  const { chatName, phoneNumber, vehicle, state, id: conversationUUID } = selectedConversation;

  return (
    <>
      <div className="flex justify-between items-start">
        <div>
          <CardTitle>{chatName || 'Conversation'}</CardTitle>
          <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center">
            <Phone className="h-3 w-3 mr-1" />
            {formatPhoneNumber(vehicle?.phone || phoneNumber || '')}
          </div>
        </div>

        {conversationUUID && (
          <div className="flex items-center space-x-2">
            <Label htmlFor={`conversation-state-${conversationUUID}`} className="text-sm">État:</Label>
            <Select
              value={state || 'active'}
              onValueChange={onStateChange}
              disabled={updatingConversationState}
            >
              <SelectTrigger id={`conversation-state-${conversationUUID}`} className="w-[150px]">
                <SelectValue placeholder="Sélectionner état" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="negotiation">Négociation</SelectItem>
                <SelectItem value="completed">Terminée</SelectItem>
                <SelectItem value="archived">Archivée</SelectItem>
              </SelectContent>
            </Select>
            {updatingConversationState && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>
        )}

        {/* Vehicle Thumbnail and Price - Compact display in header */}
        {vehicle && (
          <div className="flex items-center ml-4">
            {vehicle.image_url && (
              <img
                src={vehicle.image_url}
                alt={`${vehicle.brand} ${vehicle.model}`}
                className="w-12 h-12 object-cover rounded-md mr-2"
              />
            )}
            <div>
              <div className="text-sm font-medium">
                {vehicle.price.toLocaleString()} €
              </div>
              {vehicle.listing_url && (
                <a
                  href={vehicle.listing_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-700 text-xs flex items-center"
                  onClick={(e) => e.stopPropagation()} // Prevent card click
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Annonce
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Full Vehicle Details - Displayed below the main header part */}
      {vehicle && (
        <VehicleDetails vehicle={vehicle} layout="full" className="mt-3" />
      )}
    </>
  );
};

export default ConversationHeader;
