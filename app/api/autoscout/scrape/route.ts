import { NextRequest, NextResponse } from 'next/server';
import puppeteer, { Browser, Page } from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { isScrapingCancelled, resetCancellationFlag } from '../autoscoutState';
import { createClient } from '@supabase/supabase-js'; // Import Supabase client

// Global variable to track the browser instance
let browser: Browser | null = null;

export const dynamic = 'force-dynamic';

// Initialize Supabase client
const supabaseUrl = 'https://xnorovqcdvkuacblcpwp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhub3JvdnFjZHZrdWFjYmxjcHdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU4MjYxNTUsImV4cCI6MjA2MTQwMjE1NX0.RUTbHbV4h1I6HUFOqp5n0TZWOVyrtbqP-SD_t3yR8AQ';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  const multiPage = request.nextUrl.searchParams.get('multiPage') === 'true';

  if (!url) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
  }

  // Set up SSE response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Reset the cancellation flag
        resetCancellationFlag();

        // Send initial message
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'log', message: 'Démarrage de l\'extraction...' })}\n\n`));

        // Function to send messages to the client
        const sendMessage = (type: string, data: any) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type, ...data })}\n\n`));
        };

        // Function to send log messages
        const sendLog = (message: string) => {
          sendMessage('log', { message });
        };

        // Function to send progress updates
        const sendProgress = (value: number) => {
          sendMessage('progress', { value });
        };

        // Function to send results
        const sendResults = (vehicles: any[]) => {
          sendMessage('result', { vehicles });
        };

        // Function to send error messages
        const sendError = (message: string) => {
          sendMessage('error', { message });
          controller.close();
        };

        // Function to send completion message
        const sendComplete = () => {
          sendMessage('complete', {});
          controller.close();
        };

        // Extract data from AutoScout24
        if (multiPage) {
          await extractMultiPageAutoScout24Data(url, sendLog, sendProgress, sendResults, sendError, sendComplete);
        } else {
          await extractSinglePageAutoScout24Data(url, sendLog, sendProgress, sendResults, sendError, sendComplete);
        }
      } catch (error) {
        console.error('Error in scraping process:', error);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: 'Une erreur est survenue: ' + (error as Error).message })}\n\n`));
        controller.close();
      }
    }
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

async function extractMultiPageAutoScout24Data(
  searchUrl: string,
  sendLog: (message: string) => void,
  sendProgress: (value: number) => void,
  sendResults: (vehicles: any[]) => void,
  sendError: (message: string) => void,
  sendComplete: () => void
) {
  // Configuration
  const config = {
    // Nombre maximum de pages à scraper
    maxPages: 20,
    // Délais d'attente (en ms)
    timeouts: {
      navigation: 45000, // Augmenté à 45 secondes pour éviter les timeouts
      element: 5000,
      minDelay: 3000,  // Délai minimum entre annonces (3 secondes)
      maxDelay: 7000,  // Délai maximum entre annonces (7 secondes)
      betweenPages: 5000 // Délai entre les pages
    },
    // Nombre de tentatives max par page
    maxRetries: 2
  };

  let jobId = null;
  let initialPage = 1;
  let totalVehiclesExtracted = 0;
  let retryCount = 0;

  // Function to update job progress
  const updateJobProgress = async (currentPage: number, extractedCount: number) => {
    if (!jobId) return; // Only update if job was successfully created/found

    const { error } = await supabase
      .from('scraping_jobs')
      .update({
        current_page: currentPage,
        total_vehicles_extracted: totalVehiclesExtracted + extractedCount, // Add newly extracted count
        last_updated: new Date().toISOString()
      })
      .eq('id', jobId);

    if (error) {
      sendLog(`Error updating job progress: ${error.message}`);
    }
  };

  // Function to finalize job (complete or fail)
  const finalizeJob = async (status: 'completed' | 'failed' | 'paused', errorMessage: string | null = null) => {
    if (!jobId) return;

    const updateData: any = {
      status: status,
      last_updated: new Date().toISOString()
    };

    if (status === 'completed') {
      updateData.end_time = new Date().toISOString();
    }
    if (errorMessage) {
      updateData.error_message = errorMessage;
    }

    const { error } = await supabase
      .from('scraping_jobs')
      .update(updateData)
      .eq('id', jobId);

    if (error) {
      sendLog(`Error finalizing job ${jobId} with status ${status}: ${error.message}`);
    } else {
      sendLog(`Job ${jobId} finalized with status: ${status}`);
      // Optional: Delete completed jobs after a delay or based on a policy
      if (status === 'completed') {
         // For now, we keep completed jobs for history.
         // If cleanup is needed, add delete logic here.
      }
    }
  };


  try {
    // 1. Check for existing incomplete job
    sendLog(`Checking for existing scraping job for URL: ${searchUrl}`);
    const { data: existingJobs, error: fetchError } = await supabase
      .from('scraping_jobs')
      .select('*')
      .eq('url', searchUrl)
      .in('status', ['running', 'paused'])
      .order('last_updated', { ascending: false })
      .limit(1);

    if (fetchError) {
      sendLog(`Error checking for existing job: ${fetchError.message}`);
      // Continue as a new job if checking fails
    }

    if (existingJobs && existingJobs.length > 0) {
      // Resume existing job
      const job = existingJobs[0];
      jobId = job.id;
      initialPage = job.current_page > 0 ? job.current_page : 1;
      totalVehiclesExtracted = job.total_vehicles_extracted || 0;
      retryCount = job.retry_count || 0;

      sendLog(`Resuming scraping job ID: ${jobId} from page ${initialPage}`);

      // Update job status to running and increment retry count
      const { error: updateError } = await supabase
        .from('scraping_jobs')
        .update({
          status: 'running',
          retry_count: retryCount + 1,
          last_updated: new Date().toISOString()
        })
        .eq('id', jobId);

      if (updateError) {
        sendLog(`Error updating job status to running: ${updateError.message}`);
      }

    } else {
      // Create a new job
      sendLog('No incomplete job found. Creating a new scraping job.');

      // Get initial page from URL if present
      const urlObject = new URL(searchUrl);
      const pageParam = urlObject.searchParams.get('page');
      const startingPageFromUrl = parseInt(pageParam || '1', 10);
      initialPage = startingPageFromUrl > 0 ? startingPageFromUrl : 1;

      const { data: newJob, error: createError } = await supabase
        .from('scraping_jobs')
        .insert({
          url: searchUrl,
          current_page: initialPage,
          status: 'running',
          start_time: new Date().toISOString(),
          last_updated: new Date().toISOString(),
          config: config // Save config for potential future use
        })
        .select()
        .single();

      if (createError) {
        sendLog(`Error creating new job: ${createError.message}`);
        // Continue without job tracking if creation fails
      } else {
        jobId = newJob.id;
        sendLog(`New scraping job created with ID: ${jobId}, starting from page ${initialPage}`);
      }
    }

    // Fonction pour générer un délai d'attente aléatoire entre min et max
    const randomDelay = (min: number, max: number) => {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    };

    // Tableau pour stocker les données des véhicules
    const extractedVehicles: any[] = [];

    // Fonction d'attente (remplace waitFor)
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // Lancer le navigateur
    sendLog('Lancement du navigateur...');
    browser = await puppeteer.launch({
      headless: false, // Utiliser le mode headless
      defaultViewport: null,
      args: ['--start-maximized', '--disable-features=site-per-process'],
      timeout: 60000
    });

    // Créer une nouvelle page
    const page = await browser.newPage();

    // Function to extract vehicles from a page
    const extractVehiclesFromPage = async (url: string, pageNum: number): Promise<{ vehicles: any[], hasResults: boolean }> => {
      const pageVehicles: any[] = [];
      let hasResults = true;

      sendLog(`\n=== Processing page ${pageNum} ===`);
      sendLog(`URL: ${url}`);

      // 1. Navigate to the search page with error handling
      try {
        await page.goto(url, {
          waitUntil: 'networkidle2',
          timeout: config.timeouts.navigation
        });

        // Wait a bit for the page to load completely
        await delay(1500);
      } catch (searchPageError) {
        sendLog(`⚠ Error loading page ${pageNum}: ${(searchPageError as Error).message}`);
        sendLog('Attempting with alternative navigation options...');

        // Alternative attempt
        await page.goto(url, {
          waitUntil: 'domcontentloaded', // Less strict than networkidle2
          timeout: 60000 // Longer timeout (60 seconds)
        });
        sendLog('✓ Navigation to page successful in alternative mode');
        // Wait a bit longer for everything to load
        await delay(5000);
      }

      // 2. Check if the page contains results or "0 Offres pour votre recherche"
      const noResults = await page.evaluate(() => {
        // Check if there is a message indicating 0 results
        const noResultsText = document.body.innerText;
        return noResultsText.includes('0 Offres pour votre recherche') ||
               noResultsText.includes('0 Aanbiedingen voor uw zoekopdracht') ||
               noResultsText.includes('0 Offers for your search');
      });

      if (noResults) {
        sendLog(`⚠ Page ${pageNum}: No results found ("0 Offres pour votre recherche")`);
        return { vehicles: [], hasResults: false };
      }

      // 3. Handle cookies if present (only on the first page of the *job*)
      if (pageNum === initialPage) { // Check against initialPage of the job
        try {
          sendLog('Searching for cookie banner...');
          const cookieSelectors = [
            '._consent-accept_1lphq_114',
            'button[class*="consent-accept"]',
            'button[data-cy="consent-layer-accept"]'
          ];

          for (const selector of cookieSelectors) {
            try {
              await page.waitForSelector(selector, { timeout: 2000 });
              await page.click(selector);
              sendLog(`✓ Cookies accepted with selector: ${selector}`);
              break;
            } catch (e) {
              // Continue with the next selector
            }
          }
        } catch (error) {
          sendLog('No cookie banner found or already accepted');
        }
      }

      // 4. Retrieve all listing links and basic information from search results
      sendLog('Retrieving listing links and basic information...');
      const allListingUrls = await page.evaluate((): any[] => {
        // Possible selectors for search results
        const selectorGroups = [
          // New design
          'article.cldt-summary-full-item a.cldt-summary-full-item-header',
          'article a[data-item-name="detail-page-link"]',
          // Classic design
          'div.listing-item a.listing-item-link',
          // Generic selector
          'a[href*="/voiture-occasion/detail/"]',
          'a[href*="/offres/"]'
        ];

        let foundLinks: any[] = [];

        // Try each selector until links are found
        for (const selector of selectorGroups) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            foundLinks = Array.from(elements)
              .filter(link => {
                const href = (link as HTMLAnchorElement).href;
                return href &&
                      (href.includes('/voiture-occasion/detail/') ||
                       href.includes('/offres/'));
              })
              .map(link => {
                // Find listing title
                let title = '';
                let price = '';
                let km = '';
                let year = '';

                try {
                  // Try to find the title in different child elements
                  const titleElement = link.querySelector('h2, .cldt-summary-title, [data-item-name="title"]');
                  if (titleElement) {
                    title = (titleElement as HTMLElement).innerText.trim();
                  } else {
                    title = (link as HTMLElement).innerText.trim().split('\n')[0];
                  }

                  // Attempt to retrieve price directly from the list
                  const article = (link as HTMLElement).closest('article');
                  const priceElement = article?.querySelector('.cldt-price, [data-item-name="price"], .sc-font-xl, p[data-testid="regular-price"]');
                  if (priceElement) {
                    // Get price text
                    let priceText = priceElement.textContent?.trim() || '';

                    // Clean price by removing the "1, 5" superscript that can be added at the end
                    priceText = priceText.replace(/(\d)\s*1,\s*5$/, '$1');

                    price = priceText;
                  }

                  // Attempt to retrieve mileage
                  const kmElement = article?.querySelector('[data-type="mileage"], .cldt-stage-primary-keyfact');
                  if (kmElement) {
                    km = (kmElement as HTMLElement).innerText.trim();
                  }

                  // Attempt to retrieve year
                  const yearElement = article?.querySelector('[data-type="first-registration"], [data-item-name="registration-date"]');
                  if (yearElement) {
                    year = (yearElement as HTMLElement).innerText.trim();
                  }
                } catch (e) {
                  // Ignorer les erreurs et continuer
                }

                // Tenter d'extraire la marque et le modèle du titre
                let brand = "";
                let model = "";
                if (title) {
                  const titleParts = title.split(' ');
                  if (titleParts.length > 1) {
                    brand = titleParts[0];
                    model = titleParts.slice(1).join(' ');
                  }
                }

                return {
                  url: (link as HTMLAnchorElement).href,
                  title: title.replace(/\n/g, ' ').trim(),
                  price: price,
                  km: km,
                  year: year,
                  brand: brand,
                  model: model
                };
              });

            break;
          }
        }

        return foundLinks;
      });

      sendLog(`${allListingUrls.length} listings found on page ${pageNum}`);

      // If no listings found, try an alternative approach
      if (allListingUrls.length === 0) {
        sendLog('No listings found with standard selectors. Trying alternative approach...');

        const altListingUrls = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('a[href]'))
            .filter(link => {
              const href = (link as HTMLAnchorElement).href.toLowerCase();
              return (href.includes('/offres/') || href.includes('/voiture-occasion/detail/')) &&
                     !href.includes('#') && (link as HTMLElement).offsetParent !== null;
            })
            .map(link => {
              return {
                url: (link as HTMLAnchorElement).href,
                title: (link as HTMLElement).innerText.trim() || 'Title not found',
                price: '',
                km: '',
                year: '',
                brand: '',
                model: ''
              };
            });
        });

        if (altListingUrls.length > 0) {
          sendLog(`Alternative approach: ${altListingUrls.length} listings found`);
          allListingUrls.push(...altListingUrls);
        } else {
          sendLog('⚠ Could not find any listings on this page. Check the URL or page structure.');
          return { vehicles: [], hasResults: false };
        }
      }


      // 5. Process each listing for data extraction
      for (let i = 0; i < allListingUrls.length; i++) {
        // Check if scraping has been cancelled
        if (isScrapingCancelled) {
          sendLog('Scraping cancelled by user');
          return { vehicles: pageVehicles, hasResults: true };
        }

        const listing = allListingUrls[i];
        const listingNumber = i + 1;

        // Initialize vehicle data
        const vehicleData = {
          titre: listing.title || '',
          marque: listing.brand || '',
          modele: listing.model || '',
          prix: listing.price || '',
          annee: listing.year || '',
          kilometrage: listing.km || '',
          carburant: '',
          transmission: '',
          puissance: '',
          localisation: '',
          image_url: '',
          url: listing.url,
          telephone: '',
          vendeur: '',
          date_extraction: new Date().toLocaleDateString('fr-FR'),
          note: '',
          page: pageNum // Add page number
        };

        sendLog(`\n--- Processing listing ${listingNumber}/${allListingUrls.length} (page ${pageNum}) ---`);
        sendLog(`Title: ${vehicleData.titre}`);
        sendLog(`URL: ${vehicleData.url}`);

        // a. Navigate to the listing with timeout error handling
        try {
          await page.goto(listing.url, {
            waitUntil: 'networkidle2',
            timeout: config.timeouts.navigation
          });

          // Wait a bit for the page to load completely
          await delay(1500);
        } catch (navigationError) {
          sendLog(`⚠ Error navigating to listing: ${(navigationError as Error).message}`);
          sendLog('Attempting retrieval with alternative options...');

          try {
            // Attempt with a longer timeout and less strict waitUntil
            await page.goto(listing.url, {
              waitUntil: 'domcontentloaded', // Less strict than networkidle2
              timeout: 60000 // Longer timeout (60 seconds)
            });

            // Wait a bit longer for content to load
            await delay(3000);
            sendLog('✓ Alternative navigation successful');
          } catch (retryError) {
            sendLog(`⚠ Alternative navigation failed: ${(retryError as Error).message}`);
            sendLog('Skipping to next listing...');

            // Add entry to extracted vehicles with an error note
            vehicleData.note = 'Error: Navigation impossible';
            pageVehicles.push(vehicleData);

            // Skip to the next iteration
            continue;
          }
        }


        // b. Retrieve detailed vehicle information
        sendLog('Extracting detailed vehicle information...');

        const detailedInfo = await page.evaluate(() => {
          const details: any = {
            prix: '',
            kilometrage: '',
            annee: '',
            carburant: '',
            transmission: '',
            puissance: '',
            localisation: '',
            vendeur: '',
            image_url: ''
          };

          // PRECISE SELECTORS PROVIDED
          // Price
          const priceElement = document.querySelector('span.PriceInfo_price__XU0aF, p[data-testid="regular-price"]');
          if (priceElement) {
            // Get price text
            let priceText = priceElement.textContent?.trim() || '';

            // Clean price by removing the "1, 5" superscript that can be added at the end
            priceText = priceText.replace(/(\d)\s*1,\s*5$/, '$1');

            details.prix = priceText;
            console.log('Price found with targeted selector (cleaned):', details.prix);
          }

          // Mileage
          const kmElement = document.querySelector('.VehicleOverview_itemContainer__XSLWi:nth-child(1) > .VehicleOverview_itemText__AI4dA');
          if (kmElement) {
            details.kilometrage = kmElement.textContent?.trim() || '';
            console.log('Mileage found with targeted selector:', details.kilometrage);
          }

          // Transmission
          const transmissionElement = document.querySelector('.VehicleOverview_itemContainer__XSLWi:nth-child(2) > .VehicleOverview_itemText__AI4dA');
          if (transmissionElement) {
            details.transmission = transmissionElement.textContent?.trim() || '';
            console.log('Transmission found with targeted selector:', details.transmission);
          }

          // Year
          const yearElement = document.querySelector('.VehicleOverview_itemContainer__XSLWi:nth-child(3) > .VehicleOverview_itemText__AI4dA');
          if (yearElement) {
            details.annee = yearElement.textContent?.trim() || '';
            console.log('Year found with targeted selector:', details.annee);
          }

          // Fuel Type
          const fuelElement = document.querySelector('.VehicleOverview_itemContainer__XSLWi:nth-child(4) > .VehicleOverview_itemText__AI4dA');
          if (fuelElement) {
            details.carburant = fuelElement.textContent?.trim() || '';
            console.log('Fuel type found with targeted selector:', details.carburant);
          }

          // Power
          const powerElement = document.querySelector('.VehicleOverview_itemContainer__XSLWi:nth-child(5) > .VehicleOverview_itemText__AI4dA');
          if (powerElement) {
            details.puissance = powerElement.textContent?.trim() || '';
            console.log('Power found with targeted selector:', details.puissance);
          }

          // Location
          const locationElement = document.querySelector('a.LocationWithPin_locationItem__tK1m5');
          if (locationElement) {
            details.localisation = locationElement.textContent?.trim() || '';
            console.log('Location found with targeted selector:', details.localisation);
          }

          // Main image URL (preview)
          const imageElement = document.querySelector('.image-gallery-center img') as HTMLImageElement;
          if (imageElement) {
            details.image_url = imageElement.src;
            console.log('Image URL found:', details.image_url);
          }

          // ALTERNATIVE SELECTORS IF PRECISE SELECTORS FAIL
          // Use only if specific selectors didn't work

          if (!details.prix) {
            const altPriceElements = document.querySelectorAll('.sc-font-xl, [data-item-name="price"], .cldt-price');
            for (const el of altPriceElements) {
              if (el && el.textContent?.includes('€')) {
                // Get price text
                let priceText = el.textContent.trim();

                // Clean price by removing the "1, 5" superscript that can be added at the end
                priceText = priceText.replace(/(\d)\s*1,\s*5$/, '$1');

                details.prix = priceText;
                console.log('Price found with alternative selector (cleaned):', details.prix);
                break;
              }
            }
          }

          if (!details.kilometrage) {
            const altKmElements = document.querySelectorAll('[data-type="mileage"], .cldt-stage-primary-keyfact');
            for (const el of altKmElements) {
              if (el && (el.textContent?.includes('km') || /\d+\s*\d+/.test(el.textContent || ''))) {
                details.kilometrage = el.textContent?.trim() || '';
                console.log('Mileage found with alternative selector:', details.kilometrage);
                break;
              }
            }
          }

          if (!details.annee) {
            const altYearElement = document.querySelector('[data-type="first-registration"]');
            if (altYearElement) {
              details.annee = altYearElement.textContent?.trim() || '';
              console.log('Year found with alternative selector:', details.annee);
            }
          }

          if (!details.carburant) {
            const altFuelElement = document.querySelector('[data-type="fuel-type"]');
            if (altFuelElement) {
              details.carburant = altFuelElement.textContent?.trim() || '';
              console.log('Fuel type found with alternative selector:', details.carburant);
            } else {
              // Alternative extraction from URL
              const url = window.location.href.toLowerCase();
              if (url.includes('diesel')) details.carburant = 'Diesel';
              else if (url.includes('essence')) details.carburant = 'Essence';
              else if (url.includes('electrique')) details.carburant = 'Électrique';
              else if (url.includes('hybrid')) details.carburant = 'Hybride';
            }
          }

          if (!details.transmission) {
            const altTransmissionElement = document.querySelector('[data-type="transmission"]');
            if (altTransmissionElement) {
              details.transmission = altTransmissionElement.textContent?.trim() || '';
              console.log('Transmission found with alternative selector:', details.transmission);
            }
          }

          if (!details.puissance) {
            const altPowerElement = document.querySelector('[data-type="power"]');
            if (altPowerElement) {
              details.puissance = altPowerElement.textContent?.trim() || '';
              console.log('Power found with alternative selector:', details.puissance);
            }
          }

          if (!details.localisation) {
            const altLocationElement = document.querySelector('[data-item-name="vendor-location"], .cldt-vendor-contact-location');
            if (altLocationElement) {
              details.localisation = altLocationElement.textContent?.trim() || '';
              console.log('Location found with alternative selector:', details.localisation);
            }
          }

          if (!details.image_url) {
            // Try to find the image another way
            const altImageElement = document.querySelector('.gallery-image, .cldt-stage img') as HTMLImageElement;
            if (altImageElement) {
              details.image_url = altImageElement.src;
              console.log('Image URL found with alternative selector:', details.image_url);
            }
          }

          return details;
        });


        // Update vehicle data with detailed information
        // Clean price to remove the "1, 5" superscript that can be added at the end
        let cleanedPrice = detailedInfo.prix || vehicleData.prix || '';
        // Remove the "1, 5" or similar superscript that can be added at the end of the price
        cleanedPrice = cleanedPrice.replace(/(\d)\s*1,\s*5$/, '$1');

        vehicleData.prix = cleanedPrice;
        vehicleData.kilometrage = detailedInfo.kilometrage || vehicleData.kilometrage || '';
        vehicleData.annee = detailedInfo.annee || vehicleData.annee || '';
        vehicleData.carburant = detailedInfo.carburant || vehicleData.carburant || '';
        vehicleData.transmission = detailedInfo.transmission || vehicleData.transmission || '';
        vehicleData.puissance = detailedInfo.puissance || vehicleData.puissance || '';
        vehicleData.localisation = detailedInfo.localisation || vehicleData.localisation || '';
        vehicleData.vendeur = detailedInfo.vendeur || vehicleData.vendeur || '';
        vehicleData.image_url = detailedInfo.image_url || '';

        // Attempt to retrieve phone number
        try {
          // Check if phone button exists
          const phoneButtonExists = await page.evaluate(() => {
            const phoneButton = document.querySelector('button#call-desktop-button');
            return !!phoneButton;
          });

          if (phoneButtonExists) {
            sendLog('Phone button found, clicking to reveal number...');

            // Click the phone button
            await page.click('button#call-desktop-button');

            // Wait a bit for the number to appear
            await delay(500);

            // Retrieve phone number
            const phoneNumber = await page.evaluate(() => {
              const phoneSpan = document.querySelector('#call-desktop-button > span');
              return phoneSpan ? phoneSpan.textContent?.trim() : '';
            });

            if (phoneNumber) {
              sendLog(`Phone number retrieved: ${phoneNumber}`);
              vehicleData.telephone = phoneNumber;
            }
          }
        } catch (error) {
          sendLog('Error retrieving phone number: ' + (error as Error).message);
        }

        // Add entry to extracted vehicles
        pageVehicles.push(vehicleData);

        // Generate and apply a random delay before moving to the next listing
        const randomWaitTime = randomDelay(config.timeouts.minDelay, config.timeouts.maxDelay);
        sendLog(`Random wait of ${randomWaitTime/1000} seconds before next listing...`);
        await delay(randomWaitTime);
      }

      return { vehicles: pageVehicles, hasResults: true };
    };

    // Process each page until no more results or until the limit
    let currentUrl = new URL(searchUrl); // Use URL object to manipulate search params
    const initialPage = parseInt(currentUrl.searchParams.get('page') || '1', 10);
    let currentPage = initialPage > 0 ? initialPage : 1; // Start from initial page or 1

    let hasMoreResults = true;

    while (currentPage <= config.maxPages && hasMoreResults && !isScrapingCancelled) {
      // Update the 'page' query parameter
      currentUrl.searchParams.set('page', currentPage.toString());
      const pageUrl = currentUrl.toString();

      // Extract vehicles from the current page
      const { vehicles, hasResults } = await extractVehiclesFromPage(pageUrl, currentPage);

      // Add extracted vehicles to the global array
      if (vehicles.length > 0) {
        extractedVehicles.push(...vehicles);

        // Send updated results to the client
        sendResults([...extractedVehicles]);

        // Update progress
        const progressPercentage = Math.min(100, Math.round((currentPage / config.maxPages) * 100));
        sendProgress(progressPercentage);
      }

      // Check if there are more results
      hasMoreResults = hasResults;

      // If more results, move to the next page
      if (hasMoreResults) {
        currentPage++;

        // Wait a bit before moving to the next page
        if (currentPage <= config.maxPages) {
          sendLog(`\nWaiting ${config.timeouts.betweenPages/1000} seconds before moving to page ${currentPage}...`);
          await delay(config.timeouts.betweenPages);
        }
      } else {
        sendLog(`\nEnd of results reached at page ${currentPage}`);
      }
    }

    // Send final results
    sendLog(`\n=== Scraping complete ===`);
    sendLog(`Total vehicles extracted: ${extractedVehicles.length}`);

    // Close the browser
    if (browser) {
      sendLog('Closing browser...');
      await browser.close();
      browser = null;
    }

    // Send completion message
    sendComplete();
  } catch (error) {
    sendLog(`\n❌ ERROR: ${(error as Error).message}`);

    // Close the browser in case of error
    if (browser) {
      sendLog('Closing browser due to error...');
      await browser.close();
      browser = null;
    }

    // Send error
    sendError(`An error occurred: ${(error as Error).message}`);
  }
}

// Function to extract data from a single AutoScout24 page
async function extractSinglePageAutoScout24Data(
  searchUrl: string,
  sendLog: (message: string) => void,
  sendProgress: (value: number) => void,
  sendResults: (vehicles: any[]) => void,
  sendError: (message: string) => void,
  sendComplete: () => void
) {
  // Reuse the multi-page function but with maxPages = 1
  try {
    // Modify the URL to ensure it points to page 1
    const url = new URL(searchUrl);
    url.searchParams.set('page', '1');
    const page1Url = url.toString();

    sendLog('Single page extraction mode enabled');
    sendLog(`URL: ${page1Url}`);

    // Call the multi-page function with the same URL but limiting to 1 page
    await extractMultiPageAutoScout24Data(
      page1Url,
      sendLog,
      sendProgress,
      sendResults,
      sendError,
      sendComplete
    );
  } catch (error) {
    sendError(`Error during single page extraction: ${(error as Error).message}`);
  }
}
</file_content>

Now that you have the latest state of the file, try the operation again with fewer, more precise SEARCH blocks. For large files especially, it may be prudent to try to limit yourself to <5 SEARCH/REPLACE blocks at a time, then wait for the user to respond with the result of the operation before following up with another replace_in_file call to make additional edits.
(If you run into this error 3 times in a row, you may use the write_to_file tool as a fallback.)
</error><environment_details>
# VSCode Visible Files
../whatsappautomationV0/app/api/autoscout/scrape/route.ts

# VSCode Open Tabs
../whatsappautomationV0/.git/COMMIT_EDITMSG
../whatsappautomationV0/app/page.tsx
../../../../../Untitled-1
../whatsappautomationV0/components/WhatsAppConversations.tsx
server.js
../whatsappautomationV0/app/autoscout/page.tsx
../../../../../Untitled-2
../whatsappautomationV0/app/api/autoscout/vehicles/route.ts
../whatsappautomationV0/app/api/autoscout/scrape/route.ts

# Current Time
12/05/2025, 12:55:26 pm (Europe/Brussels, UTC+2:00)

# Context Window Usage
408,696 / 1,048.576K tokens used (39%)

# Current Mode
ACT MODE
</environment_details>
