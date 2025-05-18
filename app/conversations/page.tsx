"use client"

import { DashboardLayout } from "@/components/DashboardLayout"
import { ConversationsPage } from "@/components/conversations/ConversationsPage"

export default function ConversationsPageRoute() {
  return (
    <DashboardLayout>
      <ConversationsPage />
    </DashboardLayout>
  )
}
