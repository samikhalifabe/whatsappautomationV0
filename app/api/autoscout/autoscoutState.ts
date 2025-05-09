/**
 * Shared state for AutoScout24 scraper
 * This module allows communication between the scrape and stop routes
 */

// Flag to indicate if scraping should be cancelled
export let isScrapingCancelled = false;

// Function to set the cancellation flag
export function cancelScraping() {
  isScrapingCancelled = true;
}

// Function to reset the cancellation flag
export function resetCancellationFlag() {
  isScrapingCancelled = false;
}
