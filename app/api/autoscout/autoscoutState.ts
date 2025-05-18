export let isScrapingCancelled = false

// Function to set the cancellation flag
export function cancelScraping() {
  isScrapingCancelled = true
}

// Function to reset the cancellation flag
export function resetCancellationFlag() {
  isScrapingCancelled = false
}
