"use client"

// Ce composant est désactivé en faveur de ConversationsPage
// Veuillez utiliser components/conversations/ConversationsPage à la place

import type React from "react"

const WhatsAppConversations: React.FC = () => {
  return (
    <div className="p-4 bg-red-100 rounded-md text-red-800">
      <p className="font-bold">Ce composant est déprécié</p>
      <p>Veuillez utiliser ConversationsPage du dossier components/conversations à la place.</p>
    </div>
  )
}

export default WhatsAppConversations
