export interface AIConfig {
  enabled: boolean
  respondToAll: boolean
  keywords: string[]
  systemPrompt: string
  typingDelays?: {
    enabled: boolean
    minDelay: number
    maxDelay: number
    wordsPerMinute: number
    randomizeDelay: boolean
    showTypingIndicator: boolean
  }
  unavailabilityKeywords?: string[]
  pauseBotOnPriceOffer?: boolean
}
