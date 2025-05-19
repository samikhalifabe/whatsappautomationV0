"use client"

import { useState, useEffect, useCallback } from "react"
import axios from "axios"
import type { Database } from "@/types/supabase"

// Define types locally for now, to be centralized later
type Vehicle = Database["public"]["Tables"]["vehicles"]["Row"]
interface AppMessage {
  id: string
  from: string
  to: string
  body: string
  timestamp: number
  isFromMe: boolean
  chatName: string
  chatId: string
  conversation_id?: string
  vehicle?: Vehicle | null
  message_id?: string
}
interface ChatGroup {
  id: string // Conversation UUID
  chatId: string
  chatName: string
  messages: AppMessage[] // Kept for type consistency, but detail view fetches its own
  lastMessageTime: number
  phoneNumber: string
  rawPhoneNumbers: string[]
  vehicle?: Vehicle | null
  debugInfo?: string
  lastMessage?: AppMessage | null
  state?: string
}

// Function to update conversation state via API (can be moved to a service)
const updateConversationStateAPI = async (conversationId: string, newState: string) => {
  try {
    const response = await axios.patch(`http://localhost:3001/api/conversations/${conversationId}/state`, {
      state: newState,
    })
    return response.data.success
  } catch (error: any) {
    console.error(`Error updating conversation ${conversationId} state to ${newState}:`, error)
    return false
  }
}

export const useConversations = () => {
  const [conversations, setConversations] = useState<ChatGroup[]>([])
  const [loadingDbConversations, setLoadingDbConversations] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedConversationUUID, setSelectedConversationUUID] = useState<string | null>(null)
  const [updatingConversationState, setUpdatingConversationState] = useState<boolean>(false)
  const [newMessageNotification, setNewMessageNotification] = useState<boolean>(false) // For visual cue

  // Pagination state
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20) // Default limit
  const [totalPages, setTotalPages] = useState(1)
  const [totalConversations, setTotalConversations] = useState(0)

  const fetchDbConversations = useCallback(async () => {
    setLoadingDbConversations(true)
    setError(null)
    try {
      const response = await axios.get(`http://localhost:3001/api/conversations?page=${page}&limit=${limit}`)
      if (response.data && Array.isArray(response.data.conversations)) {
        const dbChatGroups: ChatGroup[] = response.data.conversations.map((conv: any) => ({
          id: conv.id,
          chatId: conv.chatId || conv.id,
          chatName: conv.vehicle?.brand
            ? `${conv.vehicle.brand} ${conv.vehicle.model}`
            : conv.phoneNumber || "Chat sans nom",
          messages: [], // Messages are fetched by useMessages hook
          lastMessageTime: conv.lastMessage
            ? new Date(conv.lastMessage.timestamp).getTime() / 1000
            : new Date(conv.lastMessageAt).getTime() / 1000,
          phoneNumber: conv.phoneNumber.includes("@c.us") ? conv.phoneNumber : `${conv.phoneNumber}@c.us`,
          rawPhoneNumbers: [conv.phoneNumber],
          vehicle: conv.vehicle,
          lastMessage: conv.lastMessage,
          debugInfo: `DB Conv - ID: ${conv.id}, Phone: ${conv.phoneNumber}, State: ${conv.state}`,
          state: conv.state,
          createdAt: conv.created_at, // Map the created_at from the API response
        }))
        // Sorting is now done on the server, but keep client-side sort for safety/consistency if needed
        // dbChatGroups.sort((a, b) => b.lastMessageTime - a.lastMessageTime)
        setConversations(dbChatGroups)
        setTotalPages(response.data.pagination.totalPages)
        setTotalConversations(response.data.pagination.total)

        // Auto-select first conversation if none is selected and we're on page 1
        if (dbChatGroups.length > 0 && !selectedConversationUUID && page === 1) {
          setSelectedConversationUUID(dbChatGroups[0].id)
        }
      } else {
        // Handle case where response.data or response.data.conversations is not as expected
        setConversations([])
        setTotalPages(1)
        setTotalConversations(0)
        setError("Format de réponse API inattendu lors de la récupération des conversations.")
      }
    } catch (err: any) {
      setError(`Impossible de récupérer les conversations de la base de données: ${err.message}`)
      setConversations([])
      setTotalPages(1)
      setTotalConversations(0)
    } finally {
      setLoadingDbConversations(false)
    }
  }, [page, limit, selectedConversationUUID]) // Add page and limit to dependencies

  const handleSelectConversation = useCallback((chatId: string, conversationUUID: string) => {
    setSelectedConversationUUID(conversationUUID)
    setNewMessageNotification(false) // Clear notification on selection
  }, [])

  const handleConversationStateChange = useCallback(
    async (newState: string) => {
      if (!selectedConversationUUID) return
      setUpdatingConversationState(true)
      setError(null)
      try {
        const success = await updateConversationStateAPI(selectedConversationUUID, newState)
        if (success) {
          setConversations((prev) =>
            prev.map((chat) => (chat.id === selectedConversationUUID ? { ...chat, state: newState } : chat)),
          )
        } else {
          setError("Impossible de mettre à jour l'état de la conversation.")
        }
      } catch (err: any) {
        setError(err.message || "Erreur lors de la mise à jour de l'état.")
      } finally {
        setUpdatingConversationState(false)
      }
    },
    [selectedConversationUUID],
  )

  // Callback for when a message is sent or received
  const updateConversationOnNewMessage = useCallback(
    (newMessage: AppMessage, conversationId: string) => {
      setConversations((prevConversations) => {
        const updatedConversations = [...prevConversations]
        const conversationIndex = updatedConversations.findIndex((c) => c.id === conversationId)

        if (conversationIndex !== -1) {
          // Update existing conversation
          const conversation = updatedConversations[conversationIndex]
          conversation.lastMessageTime = newMessage.timestamp
          conversation.lastMessage = newMessage
          updatedConversations[conversationIndex] = conversation

          if (selectedConversationUUID !== conversationId) {
            setNewMessageNotification(true)
            // Optional: Play sound
            // try { new Audio('/notification.mp3').play().catch(e => console.log('Audio play error:', e)); } catch (e) {}
          }
        } else {
          // Potentially create a new conversation stub if it doesn't exist
          // This might be better handled by a full refresh or a more detailed new conversation object from server
          const phoneNumber = newMessage.from !== "me" ? newMessage.from : newMessage.to
          let chatName = newMessage.chatName || "Nouvelle conversation"
          if (newMessage.vehicle) {
            chatName = `${newMessage.vehicle.brand} ${newMessage.vehicle.model}`
          }
          const newConversationStub: ChatGroup = {
            id: conversationId,
            chatId: newMessage.chatId || conversationId,
            chatName,
            messages: [], // No messages initially for the list item
            lastMessageTime: newMessage.timestamp,
            phoneNumber,
            rawPhoneNumbers: [phoneNumber.replace("@c.us", "")],
            vehicle: newMessage.vehicle || null,
            lastMessage: newMessage,
            debugInfo: `Conv created via WebSocket - Msg ID: ${newMessage.id}`,
          }
          updatedConversations.push(newConversationStub)
          setNewMessageNotification(true)
        }
        return updatedConversations.sort((a, b) => b.lastMessageTime - a.lastMessageTime)
      })
    },
    [selectedConversationUUID],
  )

  // Initial fetch and fetch on page/limit change
  useEffect(() => {
    fetchDbConversations()
  }, [fetchDbConversations, page, limit]) // Depend on fetchDbConversations, page, and limit

  // Pagination navigation functions
  const nextPage = useCallback(() => {
    setPage((prev) => Math.min(prev + 1, totalPages))
  }, [totalPages])

  const prevPage = useCallback(() => {
    setPage((prev) => Math.max(prev - 1, 1))
  }, [])

  const goToPage = useCallback(
    (pageNum: number) => {
      setPage(Math.max(1, Math.min(pageNum, totalPages)))
    },
    [totalPages],
  )

  const selectedConversation = conversations.find((c) => c.id === selectedConversationUUID)

  return {
    conversations,
    loadingDbConversations,
    error,
    selectedConversation, // Derived state
    selectedConversationUUID,
    updatingConversationState,
    newMessageNotification,
    fetchDbConversations,
    handleSelectConversation,
    handleConversationStateChange,
    updateConversationOnNewMessage,
    setNewMessageNotification, // Expose to clear notification from parent if needed
    setError, // Expose to allow parent to set errors

    // Expose pagination state and functions
    page,
    limit,
    totalPages,
    totalConversations,
    setLimit, // Allow changing limit from parent
    nextPage,
    prevPage,
    goToPage,
  }
}
