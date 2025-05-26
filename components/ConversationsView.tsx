"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, MessageCircle, Send, Car, Phone } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/hooks/useAuth"
import { getConversations, getConversation, sendWhatsAppMessage } from "@/services/messageService"
import { useWhatsApp } from "./WhatsAppContext"
import type { FormattedConversation } from "../types/conversations"

const ConversationsView: React.FC = () => {
  const { user } = useAuth()
  const { status } = useWhatsApp()

  const [conversations, setConversations] = useState<FormattedConversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<FormattedConversation | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Message sending state
  const [messageText, setMessageText] = useState<string>("")
  const [sendingMessage, setSendingMessage] = useState<boolean>(false)
  const [sendError, setSendError] = useState<string | null>(null)

  // Fetch conversations on component mount
  useEffect(() => {
    fetchConversations()
  }, [])

  // Fetch conversations from the server
  const fetchConversations = async () => {
    try {
      setLoading(true)
      setError(null)

      const data: any[] = await getConversations() // Use any for now to handle incoming data structure

      const formattedConversations: FormattedConversation[] = data.map((conv) => ({
        id: conv.id,
        phoneNumber: conv.phone_number,
        chatId: conv.chat_id,
        lastMessageAt: conv.last_message_at,
        vehicle: conv.vehicle, // Assuming vehicle structure matches
        messages: conv.messages.map((msg: any) => ({
          // Map messages
          id: msg.id,
          body: msg.body,
          timestamp: new Date(msg.timestamp).getTime() / 1000, // Convert timestamp string to number
          isFromMe: msg.is_from_me, // Map is_from_me to isFromMe
        })),
        lastMessage: conv.last_message
          ? {
              // Map lastMessage if exists
              id: conv.last_message.id,
              body: conv.last_message.body,
              timestamp: new Date(conv.last_message.timestamp).getTime() / 1000,
              isFromMe: conv.last_message.is_from_me,
            }
          : null,
      }))

      setConversations(formattedConversations)

      // Select the first conversation by default
      if (formattedConversations.length > 0 && !selectedConversation) {
        await selectConversation(formattedConversations[0].id)
      }
    } catch (err: any) {
      console.error("Error fetching conversations:", err)
      setError(err.message || "Failed to fetch conversations")
    } finally {
      setLoading(false)
    }
  }

  // Select a conversation and fetch its details
  const selectConversation = async (conversationId: string) => {
    try {
      setLoading(true)

      const conversation: any = await getConversation(conversationId) // Use any for now

      const formattedConversation: FormattedConversation = {
        id: conversation.id,
        phoneNumber: conversation.phone_number,
        chatId: conversation.chat_id,
        lastMessageAt: conversation.last_message_at,
        vehicle: conversation.vehicle, // Assuming vehicle structure matches
        messages: conversation.messages.map((msg: any) => ({
          // Map messages
          id: msg.id,
          body: msg.body,
          timestamp: new Date(msg.timestamp).getTime() / 1000, // Convert timestamp string to number
          isFromMe: msg.is_from_me, // Map is_from_me to isFromMe
        })),
        lastMessage: conversation.last_message
          ? {
              // Map lastMessage if exists
              id: conversation.last_message.id,
              body: conversation.last_message.body,
              timestamp: new Date(conversation.last_message.timestamp).getTime() / 1000,
              isFromMe: conversation.last_message.is_from_me,
            }
          : null,
      }

      setSelectedConversation(formattedConversation)
    } catch (err: any) {
      console.error("Error fetching conversation details:", err)
      setError(err.message || "Failed to fetch conversation details")
    } finally {
      setLoading(false)
    }
  }

  // Send a message
  const handleSendMessage = async () => {
    if (!selectedConversation || !messageText.trim() || !user) return

    if (!selectedConversation.vehicle) {
      setSendError("No vehicle associated with this conversation")
      return
    }

    setSendingMessage(true)
    setSendError(null)

    try {
      const result = await sendWhatsAppMessage(
        selectedConversation.phoneNumber,
        messageText,
        selectedConversation.vehicle,
        user.id,
      )

      if (result.success) {
        setMessageText("")
        // Refresh the conversation to show the new message
        await selectConversation(selectedConversation.id)
      } else {
        setSendError(result.error || "Failed to send message")
      }
    } catch (err: any) {
      console.error("Error sending message:", err)
      setSendError(err.message || "Error sending message")
    } finally {
      setSendingMessage(false)
    }
  }

  // Format date for display
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000) // Convert timestamp (seconds) to milliseconds
    const now = new Date()

    // If it's today, show only the time
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }

    // Otherwise, show the date and time
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">WhatsApp Conversations</h1>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between items-center mb-6">
        <Button onClick={fetchConversations} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : (
            "Refresh Conversations"
          )}
        </Button>
      </div>

      {loading && !conversations.length ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : conversations.length === 0 ? (
        <div className="text-center p-8 border rounded-lg">
          <MessageCircle className="h-12 w-12 mx-auto mb-4 text-slate-400" />
          <p className="text-slate-500">No conversations found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Conversations List */}
          <div className="md:col-span-1">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Conversations</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[600px] overflow-y-auto">
                  {conversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      className={`p-4 border-b cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors
                        ${selectedConversation?.id === conversation.id ? "bg-slate-100 dark:bg-slate-800" : ""}`}
                      onClick={() => selectConversation(conversation.id)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">
                            {conversation.vehicle
                              ? `${conversation.vehicle.brand} ${conversation.vehicle.model}`
                              : "Unknown"}
                          </h3>
                          <div className="flex items-center text-xs text-slate-500 dark:text-slate-400">
                            <Phone className="h-3 w-3 mr-1" />
                            {conversation.phoneNumber}
                          </div>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {conversation.lastMessage ? formatDate(conversation.lastMessage.timestamp) : ""}
                        </div>
                      </div>
                      {conversation.lastMessage && (
                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                          {conversation.lastMessage.body}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Conversation Detail */}
          <div className="md:col-span-2">
            {selectedConversation ? (
              <Card className="h-full flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>
                        {selectedConversation.vehicle
                          ? `${selectedConversation.vehicle.brand} ${selectedConversation.vehicle.model}`
                          : "Unknown"}
                      </CardTitle>
                      <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center">
                        <Phone className="h-3 w-3 mr-1" />
                        {selectedConversation.phoneNumber}
                      </div>
                    </div>
                    {selectedConversation.vehicle && (
                      <div className="text-right">
                        <h3 className="font-medium text-sm flex items-center justify-end">
                          <Car className="h-4 w-4 mr-1 text-green-500" />
                          Vehicle Details
                        </h3>
                        <div className="space-y-1 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {selectedConversation.vehicle.year}
                          </Badge>
                          <Badge variant="outline" className="text-xs ml-1">
                            {selectedConversation.vehicle.mileage.toLocaleString()} km
                          </Badge>
                          <Badge variant="outline" className="text-xs ml-1">
                            {selectedConversation.vehicle.price.toLocaleString()} €
                          </Badge>
                        </div>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-grow overflow-y-auto pt-0 flex flex-col">
                  <div className="flex flex-col space-y-3 pb-3 flex-grow">
                    {selectedConversation.messages.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-slate-400">No messages yet</div>
                    ) : (
                      selectedConversation.messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.isFromMe ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[80%] px-4 py-2 rounded-lg
                              ${
                                msg.isFromMe
                                  ? "bg-green-500 text-white rounded-tr-none"
                                  : "bg-slate-200 dark:bg-slate-700 rounded-tl-none"
                              }`}
                          >
                            <p className="break-words">{msg.body}</p>
                            <div className="text-xs mt-1 text-right opacity-70">{formatDate(msg.timestamp)}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {status !== "connected" && (
                    <Alert variant="destructive" className="mb-2">
                      <AlertTitle>WhatsApp not connected</AlertTitle>
                      <AlertDescription>Please connect to WhatsApp before sending messages.</AlertDescription>
                    </Alert>
                  )}

                  {sendError && (
                    <Alert variant="destructive" className="mb-2">
                      <AlertTitle>Error sending message</AlertTitle>
                      <AlertDescription>{sendError}</AlertDescription>
                    </Alert>
                  )}

                  <div className="mt-auto flex items-center space-x-2">
                    <Textarea
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="Type your message..."
                      className="flex-grow"
                      disabled={status !== "connected"}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!messageText.trim() || status !== "connected" || sendingMessage}
                      className="bg-green-500 hover:bg-green-600 text-white"
                    >
                      {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="h-full flex items-center justify-center">
                <CardContent>
                  <div className="text-center text-slate-500 dark:text-slate-400">
                    <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a conversation to view messages</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ConversationsView
