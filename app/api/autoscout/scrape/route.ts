import { type NextRequest, NextResponse } from "next/server"
import puppeteer, { type Browser } from "puppeteer"
import { isScrapingCancelled, resetCancellationFlag } from "../autoscoutState"

// Global variable to track the browser instance
let browser: Browser | null = null

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url")
  const multiPage = request.nextUrl.searchParams.get("multiPage") === "true"

  if (!url) {
    return NextResponse.json({ error: "URL parameter is required" }, { status: 400 })
  }

  // Set up SSE response
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Reset the cancellation flag
        resetCancellationFlag()

        // Send initial message
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "log", message: "Démarrage de l'extraction..." })}\n\n`),
        )

        // Function to send messages to the client
        const sendMessage = (type: string, data: any) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type, ...data })}\n\n`))
        }

        // Function to send log messages
        const sendLog = (message: string) => {
          sendMessage("log", { message })
        }

        // Function to send progress updates
        const sendProgress = (value: number) => {
          sendMessage("progress", { value })
        }

        // Function to send results
        const sendResults = (vehicles: any[]) => {
          sendMessage("result", { vehicles })
        }

        // Function to send error messages
        const sendError = (message: string) => {
          sendMessage("error", { message })
          controller.close()
        }

        // Function to send completion message
        const sendComplete = () => {
          sendMessage("complete", {})
          controller.close()
        }

        // Extract data from AutoScout24
        if (multiPage) {
          await extractMultiPageAutoScout24Data(url, sendLog, sendProgress, sendResults, sendError, sendComplete)
        } else {
          await extractSinglePageAutoScout24Data(url, sendLog, sendProgress, sendResults, sendError, sendComplete)
        }
      } catch (error) {
        console.error("Error in scraping process:", error)
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", message: "Une erreur est survenue: " + (error as Error).message })}\n\n`,
          ),
        )
        controller.close()
      }
    },
  })

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}

async function extractMultiPageAutoScout24Data(
  searchUrl: string,
  sendLog: (message: string) => void,
  sendProgress: (value: number) => void,
  sendResults: (vehicles: any[]) => void,
  sendError: (message: string) => void,
  sendComplete: () => void,
) {
  // Configuration
  const config = {
    // URL de recherche de base (sans le paramètre page)
    baseSearchUrl: searchUrl.includes("page=")
      ? searchUrl.replace(/page=\d+/, "page=")
      : searchUrl + (searchUrl.includes("?") ? "&page=" : "?page="),
    // Nombre maximum de pages à scraper
    maxPages: 20,
    // Délais d'attente (en ms)
    timeouts: {
      navigation: 45000, // Augmenté à 45 secondes pour éviter les timeouts
      element: 5000,
      minDelay: 3000, // Délai minimum entre annonces (3 secondes)
      maxDelay: 7000, // Délai maximum entre annonces (7 secondes)
      betweenPages: 5000, // Délai entre les pages
    },
    // Nombre de tentatives max par page
    maxRetries: 2,
  }

  // Fonction pour générer un délai d'attente aléatoire entre min et max
  const randomDelay = (min: number, max: number) => {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  // Tableau pour stocker les données des véhicules
  const extractedVehicles: any[] = []

  sendLog(`=== Démarrage du script d'extraction multi-pages AutoScout24 ===`)
  sendLog(`URL de recherche de base: ${config.baseSearchUrl}`)
  sendLog(`Nombre maximum de pages à scraper: ${config.maxPages}`)

  // Fonction d'attente (remplace waitFor)
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

  try {
    // Lancer le navigateur
    sendLog("Lancement du navigateur...")
    browser = await puppeteer.launch({
      headless: false, // Utiliser le mode headless
      defaultViewport: null,
      args: ["--start-maximized", "--disable-features=site-per-process"],
      timeout: 60000,
    })

    // Créer une nouvelle page
    const page = await browser.newPage()

    // Fonction pour extraire les véhicules d'une page
    const extractVehiclesFromPage = async (pageNum: number): Promise<{ vehicles: any[]; hasResults: boolean }> => {
      const pageUrl = config.baseSearchUrl + pageNum
      const pageVehicles: any[] = []
      const hasResults = true

      sendLog(`\n=== Traitement de la page ${pageNum} ===`)
      sendLog(`URL: ${pageUrl}`)

      // 1. Accéder à la page de recherche avec gestion d'erreur
      try {
        await page.goto(pageUrl, {
          waitUntil: "networkidle2",
          timeout: config.timeouts.navigation,
        })
      } catch (searchPageError) {
        sendLog(`⚠ Erreur lors du chargement de la page ${pageNum}: ${(searchPageError as Error).message}`)
        sendLog("Tentative avec options de navigation alternatives...")

        // Tentative alternative
        await page.goto(pageUrl, {
          waitUntil: "domcontentloaded",
          timeout: 60000,
        })
        sendLog("✓ Navigation vers la page réussie en mode alternatif")
        // Attendre un peu plus pour que tout se charge
        await delay(5000)
      }

      // 2. Vérifier si la page contient des résultats ou "0 Offres pour votre recherche"
      const noResults = await page.evaluate(() => {
        // Vérifier s'il y a un message indiquant 0 résultats
        const noResultsText = document.body.innerText
        return (
          noResultsText.includes("0 Offres pour votre recherche") ||
          noResultsText.includes("0 Aanbiedingen voor uw zoekopdracht") ||
          noResultsText.includes("0 Offers for your search")
        )
      })

      if (noResults) {
        sendLog(`⚠ Page ${pageNum}: Aucun résultat trouvé ("0 Offres pour votre recherche")`)
        return { vehicles: [], hasResults: false }
      }

      // 3. Gérer les cookies si présents (seulement sur la première page)
      if (pageNum === 1) {
        try {
          sendLog("Recherche de la bannière de cookies...")
          const cookieSelectors = [
            "._consent-accept_1lphq_114",
            'button[class*="consent-accept"]',
            'button[data-cy="consent-layer-accept"]',
          ]

          for (const selector of cookieSelectors) {
            try {
              await page.waitForSelector(selector, { timeout: 2000 })
              await page.click(selector)
              sendLog(`✓ Cookies acceptés avec le sélecteur: ${selector}`)
              break
            } catch (e) {
              // Continuer avec le prochain sélecteur
            }
          }
        } catch (error) {
          sendLog("Pas de bannière de cookies trouvée ou déjà acceptée")
        }
      }

      // 4. Récupérer tous les liens d'annonces et informations de base dans les résultats de recherche
      sendLog("Récupération des liens d'annonces et informations de base...")
      const allListingUrls = await page.evaluate((): any[] => {
        // Sélecteurs possibles pour les résultats de recherche
        const selectorGroups = [
          // Nouveau design
          "article.cldt-summary-full-item a.cldt-summary-full-item-header",
          'article a[data-item-name="detail-page-link"]',
          // Design classique
          "div.listing-item a.listing-item-link",
          // Sélecteur générique
          'a[href*="/voiture-occasion/detail/"]',
          'a[href*="/offres/"]',
        ]

        let foundLinks: any[] = []

        // Essayer chaque sélecteur jusqu'à trouver des liens
        for (const selector of selectorGroups) {
          const elements = document.querySelectorAll(selector)
          if (elements.length > 0) {
            foundLinks = Array.from(elements)
              .filter((link) => {
                const href = (link as HTMLAnchorElement).href
                return href && (href.includes("/voiture-occasion/detail/") || href.includes("/offres/"))
              })
              .map((link) => {
                // Trouver le titre de l'annonce
                let title = ""
                let price = ""
                let km = ""
                let year = ""

                try {
                  // Essayer de trouver le titre dans différents éléments enfants
                  const titleElement = link.querySelector('h2, .cldt-summary-title, [data-item-name="title"]')
                  if (titleElement) {
                    title = (titleElement as HTMLElement).innerText.trim()
                  } else {
                    title = (link as HTMLElement).innerText.trim().split("\n")[0]
                  }

                  // Essai de récupération du prix directement depuis la liste
                  const article = (link as HTMLElement).closest("article")
                  const priceElement = article?.querySelector(
                    '.cldt-price, [data-item-name="price"], .sc-font-xl, p[data-testid="regular-price"]',
                  )
                  if (priceElement) {
                    // Récupérer le texte du prix
                    let priceText = (priceElement as HTMLElement).innerText.trim()

                    // Nettoyer le prix en supprimant le superscript "1, 5" qui peut être ajouté à la fin
                    priceText = priceText.replace(/(\d)\s*1,\s*5$/, "$1")

                    price = priceText
                  }

                  // Essai de récupération du kilométrage
                  const kmElement = article?.querySelector('[data-type="mileage"], [data-item-name="mileage"]')
                  if (kmElement) {
                    km = (kmElement as HTMLElement).innerText.trim()
                  }

                  // Essai de récupération de l'année
                  const yearElement = article?.querySelector(
                    '[data-type="first-registration"], [data-item-name="registration-date"]',
                  )
                  if (yearElement) {
                    year = (yearElement as HTMLElement).innerText.trim()
                  }
                } catch (e) {
                  // Ignorer les erreurs et continuer
                }

                // Tenter d'extraire la marque et le modèle du titre
                let brand = ""
                let model = ""
                if (title) {
                  const titleParts = title.split(" ")
                  if (titleParts.length > 1) {
                    brand = titleParts[0]
                    model = titleParts.slice(1).join(" ")
                  }
                }

                return {
                  url: (link as HTMLAnchorElement).href,
                  title: title.replace(/\n/g, " ").trim(),
                  price: price,
                  km: km,
                  year: year,
                  brand: brand,
                  model: model,
                }
              })

            break
          }
        }

        return foundLinks
      })

      sendLog(`${allListingUrls.length} annonces trouvées sur la page ${pageNum}`)

      // Si aucune annonce n'est trouvée, essayer une autre approche
      if (allListingUrls.length === 0) {
        sendLog("Aucune annonce trouvée avec les sélecteurs standards. Essai d'une approche alternative...")

        // Approche alternative pour trouver des liens d'annonces
        const altListingUrls = await page.evaluate(() => {
          return Array.from(document.querySelectorAll("a[href]"))
            .filter((link) => {
              const href = (link as HTMLAnchorElement).href.toLowerCase()
              return (
                (href.includes("/offres/") || href.includes("/voiture-occasion/detail/")) &&
                !href.includes("#") &&
                (link as HTMLElement).offsetParent !== null
              )
            })
            .map((link) => {
              return {
                url: (link as HTMLAnchorElement).href,
                title: (link as HTMLElement).innerText.trim() || "Titre non trouvé",
                price: "",
                km: "",
                year: "",
                brand: "",
                model: "",
              }
            })
        })

        if (altListingUrls.length > 0) {
          sendLog(`Approche alternative: ${altListingUrls.length} annonces trouvées`)
          allListingUrls.push(...altListingUrls)
        } else {
          sendLog("⚠ Impossible de trouver des annonces sur cette page. Vérifiez l'URL ou la structure de la page.")
          return { vehicles: [], hasResults: false }
        }
      }

      // 5. Traiter chaque annonce pour extraction des données
      for (let i = 0; i < allListingUrls.length; i++) {
        // Check if scraping has been cancelled
        if (isScrapingCancelled) {
          sendLog("Extraction annulée par l'utilisateur")
          return { vehicles: pageVehicles, hasResults: true }
        }

        const listing = allListingUrls[i]
        const listingNumber = i + 1

        // Initialiser les données du véhicule
        const vehicleData = {
          titre: listing.title || "",
          marque: listing.brand || "",
          modele: listing.model || "",
          prix: listing.price || "",
          annee: listing.year || "",
          kilometrage: listing.km || "",
          carburant: "",
          transmission: "",
          puissance: "",
          localisation: "",
          image_url: "",
          url: listing.url,
          telephone: "",
          vendeur: "",
          date_extraction: new Date().toLocaleDateString("fr-FR"),
          note: "",
          page: pageNum, // Ajouter le numéro de page
        }

        sendLog(`\n--- Traitement de l'annonce ${listingNumber}/${allListingUrls.length} (page ${pageNum}) ---`)
        sendLog(`Titre: ${vehicleData.titre}`)
        sendLog(`URL: ${vehicleData.url}`)

        // a. Naviguer vers l'annonce avec gestion des erreurs de timeout
        try {
          await page.goto(listing.url, {
            waitUntil: "networkidle2",
            timeout: config.timeouts.navigation,
          })

          // Attendre que la page soit complètement chargée
          await delay(1500)
        } catch (navigationError) {
          sendLog(`⚠ Erreur lors de la navigation vers l'annonce: ${(navigationError as Error).message}`)
          sendLog("Tentative de récupération avec options alternatives...")

          try {
            // Tentative avec un timeout plus long et waitUntil moins strict
            await page.goto(listing.url, {
              waitUntil: "domcontentloaded", // Moins strict que networkidle2
              timeout: 60000, // Timeout plus long (60 secondes)
            })

            // Attendre un peu plus longtemps pour que le contenu se charge
            await delay(3000)
            sendLog("✓ Navigation alternative réussie")
          } catch (retryError) {
            sendLog(`⚠ Échec de la navigation alternative: ${(retryError as Error).message}`)
            sendLog("Passage à l'annonce suivante...")

            // Ajouter l'entrée aux véhicules extraits avec une note d'erreur
            vehicleData.note = "Erreur: Navigation impossible"
            pageVehicles.push(vehicleData)

            // Passer à l'itération suivante
            continue
          }
        }

        // b. Récupérer les informations détaillées du véhicule
        sendLog("Extraction des informations détaillées du véhicule...")

        const detailedInfo = await page.evaluate(() => {
          const details: any = {
            prix: "",
            kilometrage: "",
            annee: "",
            carburant: "",
            transmission: "",
            puissance: "",
            localisation: "",
            vendeur: "",
            image_url: "",
          }

          // SÉLECTEURS PRÉCIS FOURNIS
          // Prix
          const priceElement = document.querySelector('span.PriceInfo_price__XU0aF, p[data-testid="regular-price"]')
          if (priceElement) {
            // Récupérer le texte du prix
            let priceText = priceElement.textContent?.trim() || ""

            // Nettoyer le prix en supprimant le superscript "1, 5" qui peut être ajouté à la fin
            priceText = priceText.replace(/(\d)\s*1,\s*5$/, "$1")

            details.prix = priceText
            console.log("Prix trouvé avec le sélecteur ciblé (nettoyé):", details.prix)
          }

          // Kilométrage
          const kmElement = document.querySelector(
            ".VehicleOverview_itemContainer__XSLWi:nth-child(1) > .VehicleOverview_itemText__AI4dA",
          )
          if (kmElement) {
            details.kilometrage = kmElement.textContent?.trim() || ""
            console.log("Kilométrage trouvé avec le sélecteur ciblé:", details.kilometrage)
          }

          // Transmission
          const transmissionElement = document.querySelector(
            ".VehicleOverview_itemContainer__XSLWi:nth-child(2) > .VehicleOverview_itemText__AI4dA",
          )
          if (transmissionElement) {
            details.transmission = transmissionElement.textContent?.trim() || ""
            console.log("Transmission trouvée avec le sélecteur ciblé:", details.transmission)
          }

          // Année
          const yearElement = document.querySelector(
            ".VehicleOverview_itemContainer__XSLWi:nth-child(3) > .VehicleOverview_itemText__AI4dA",
          )
          if (yearElement) {
            details.annee = yearElement.textContent?.trim() || ""
            console.log("Année trouvée avec le sélecteur ciblé:", details.annee)
          }

          // Carburant
          const fuelElement = document.querySelector(
            ".VehicleOverview_itemContainer__XSLWi:nth-child(4) > .VehicleOverview_itemText__AI4dA",
          )
          if (fuelElement) {
            details.carburant = fuelElement.textContent?.trim() || ""
            console.log("Carburant trouvé avec le sélecteur ciblé:", details.carburant)
          }

          // Puissance
          const powerElement = document.querySelector(
            ".VehicleOverview_itemContainer__XSLWi:nth-child(5) > .VehicleOverview_itemText__AI4dA",
          )
          if (powerElement) {
            details.puissance = powerElement.textContent?.trim() || ""
            console.log("Puissance trouvée avec le sélecteur ciblé:", details.puissance)
          }

          // Localisation
          const locationElement = document.querySelector("a.LocationWithPin_locationItem__tK1m5")
          if (locationElement) {
            details.localisation = locationElement.textContent?.trim() || ""
            console.log("Localisation trouvée avec le sélecteur ciblé:", details.localisation)
          }

          // URL de l'image principale (aperçu)
          const imageElement = document.querySelector(".image-gallery-center img") as HTMLImageElement
          if (imageElement) {
            details.image_url = imageElement.src
            console.log("URL de l'image trouvée:", details.image_url)
          }

          // SÉLECTEURS ALTERNATIFS SI LES SÉLECTEURS PRÉCIS ÉCHOUENT
          // Utiliser uniquement si les sélecteurs spécifiques n'ont pas fonctionné

          if (!details.prix) {
            const altPriceElements = document.querySelectorAll('.sc-font-xl, [data-item-name="price"], .cldt-price')
            for (const el of altPriceElements) {
              if (el && el.textContent?.includes("€")) {
                // Récupérer le texte du prix
                let priceText = el.textContent.trim()

                // Nettoyer le prix en supprimant le superscript "1, 5" qui peut être ajouté à la fin
                priceText = priceText.replace(/(\d)\s*1,\s*5$/, "$1")

                details.prix = priceText
                console.log("Prix trouvé avec sélecteur alternatif (nettoyé):", details.prix)
                break
              }
            }
          }

          if (!details.kilometrage) {
            const altKmElements = document.querySelectorAll('[data-type="mileage"], .cldt-stage-primary-keyfact')
            for (const el of altKmElements) {
              if (el && (el.textContent?.includes("km") || /\d+\s*\d+/.test(el.textContent || ""))) {
                details.kilometrage = el.textContent?.trim() || ""
                console.log("Kilométrage trouvé avec sélecteur alternatif:", details.kilometrage)
                break
              }
            }
          }

          if (!details.annee) {
            const altYearElement = document.querySelector('[data-type="first-registration"]')
            if (altYearElement) {
              details.annee = altYearElement.textContent?.trim() || ""
              console.log("Année trouvée avec sélecteur alternatif:", details.annee)
            }
          }

          if (!details.carburant) {
            const altFuelElement = document.querySelector('[data-type="fuel-type"]')
            if (altFuelElement) {
              details.carburant = altFuelElement.textContent?.trim() || ""
              console.log("Carburant trouvé avec sélecteur alternatif:", details.carburant)
            } else {
              // Extraction alternative depuis l'URL
              const url = window.location.href.toLowerCase()
              if (url.includes("diesel")) details.carburant = "Diesel"
              else if (url.includes("essence")) details.carburant = "Essence"
              else if (url.includes("electrique")) details.carburant = "Électrique"
              else if (url.includes("hybrid")) details.carburant = "Hybride"
            }
          }

          if (!details.transmission) {
            const altTransmissionElement = document.querySelector('[data-type="transmission"]')
            if (altTransmissionElement) {
              details.transmission = altTransmissionElement.textContent?.trim() || ""
              console.log("Transmission trouvée avec sélecteur alternatif:", details.transmission)
            }
          }

          if (!details.puissance) {
            const altPowerElement = document.querySelector('[data-type="power"]')
            if (altPowerElement) {
              details.puissance = altPowerElement.textContent?.trim() || ""
              console.log("Puissance trouvée avec sélecteur alternatif:", details.puissance)
            }
          }

          if (!details.localisation) {
            const altLocationElement = document.querySelector(
              '[data-item-name="vendor-location"], .cldt-vendor-contact-location',
            )
            if (altLocationElement) {
              details.localisation = altLocationElement.textContent?.trim() || ""
              console.log("Localisation trouvée avec sélecteur alternatif:", details.localisation)
            }
          }

          if (!details.image_url) {
            // Essayer de trouver l'image autrement
            const altImageElement = document.querySelector(".gallery-image, .cldt-stage img") as HTMLImageElement
            if (altImageElement) {
              details.image_url = altImageElement.src
              console.log("URL de l'image trouvée avec sélecteur alternatif:", details.image_url)
            }
          }

          return details
        })

        // Mettre à jour les données du véhicule avec les informations détaillées
        // Nettoyer le prix pour supprimer le superscript "1, 5" qui peut s'ajouter à la fin
        let cleanedPrice = detailedInfo.prix || vehicleData.prix || ""
        // Supprimer le superscript "1, 5" ou similaire qui peut être ajouté à la fin du prix
        cleanedPrice = cleanedPrice.replace(/(\d)\s*1,\s*5$/, "$1")

        vehicleData.prix = cleanedPrice
        vehicleData.kilometrage = detailedInfo.kilometrage || vehicleData.kilometrage || ""
        vehicleData.annee = detailedInfo.annee || vehicleData.annee || ""
        vehicleData.carburant = detailedInfo.carburant || vehicleData.carburant || ""
        vehicleData.transmission = detailedInfo.transmission || vehicleData.transmission || ""
        vehicleData.puissance = detailedInfo.puissance || vehicleData.puissance || ""
        vehicleData.localisation = detailedInfo.localisation || vehicleData.localisation || ""
        vehicleData.vendeur = detailedInfo.vendeur || vehicleData.vendeur || ""
        vehicleData.image_url = detailedInfo.image_url || ""

        // Tentative de récupération du numéro de téléphone
        try {
          // Vérifier si le bouton du téléphone existe
          const phoneButtonExists = await page.evaluate(() => {
            const phoneButton = document.querySelector("button#call-desktop-button")
            return !!phoneButton
          })

          if (phoneButtonExists) {
            sendLog("Bouton de téléphone trouvé, clic pour révéler le numéro...")

            // Cliquer sur le bouton du téléphone
            await page.click("button#call-desktop-button")

            // Attendre un peu que le numéro s'affiche
            await delay(500)

            // Récupérer le numéro de téléphone
            const phoneNumber = await page.evaluate(() => {
              const phoneSpan = document.querySelector("#call-desktop-button > span")
              return phoneSpan ? phoneSpan.textContent?.trim() : ""
            })

            if (phoneNumber) {
              sendLog(`Numéro de téléphone récupéré: ${phoneNumber}`)
              vehicleData.telephone = phoneNumber
            }
          }
        } catch (error) {
          sendLog("Erreur lors de la récupération du numéro de téléphone: " + (error as Error).message)
        }

        // Ajouter l'entrée aux véhicules extraits
        pageVehicles.push(vehicleData)

        // Générer et appliquer un délai d'attente aléatoire avant de passer à l'annonce suivante
        const randomWaitTime = randomDelay(config.timeouts.minDelay, config.timeouts.maxDelay)
        sendLog(`Attente aléatoire de ${randomWaitTime / 1000} secondes avant la prochaine annonce...`)
        await delay(randomWaitTime)
      }

      return { vehicles: pageVehicles, hasResults: true }
    }

    // Traiter chaque page jusqu'à ce qu'il n'y ait plus de résultats ou jusqu'à la limite
    let currentPage = 1
    let hasMoreResults = true

    while (currentPage <= config.maxPages && hasMoreResults && !isScrapingCancelled) {
      // Extraire les véhicules de la page courante
      const { vehicles, hasResults } = await extractVehiclesFromPage(currentPage)

      // Ajouter les véhicules extraits au tableau global
      if (vehicles.length > 0) {
        extractedVehicles.push(...vehicles)

        // Envoyer les résultats mis à jour au client
        sendResults([...extractedVehicles])

        // Mettre à jour la progression
        const progressPercentage = Math.min(100, Math.round((currentPage / config.maxPages) * 100))
        sendProgress(progressPercentage)
      }

      // Vérifier s'il y a encore des résultats
      hasMoreResults = hasResults

      // Si plus de résultats, passer à la page suivante
      if (hasMoreResults) {
        currentPage++

        // Attendre un peu avant de passer à la page suivante
        if (currentPage <= config.maxPages) {
          sendLog(
            `\nAttente de ${config.timeouts.betweenPages / 1000} secondes avant de passer à la page ${currentPage}...`,
          )
          await delay(config.timeouts.betweenPages)
        }
      } else {
        sendLog(`\nFin des résultats atteinte à la page ${currentPage}`)
      }
    }

    // Envoyer les résultats finaux
    sendLog(`\n=== Extraction terminée ===`)
    sendLog(`Total de véhicules extraits: ${extractedVehicles.length}`)

    // Fermer le navigateur
    if (browser) {
      sendLog("Fermeture du navigateur...")
      await browser.close()
      browser = null
    }

    // Envoyer le message de complétion
    sendComplete()
  } catch (error) {
    sendLog(`\n❌ ERREUR: ${(error as Error).message}`)

    // Fermer le navigateur en cas d'erreur
    if (browser) {
      sendLog("Fermeture du navigateur suite à une erreur...")
      await browser.close()
      browser = null
    }

    // Envoyer l'erreur
    sendError(`Une erreur est survenue: ${(error as Error).message}`)
  }
}

// Fonction pour extraire les données d'une seule page AutoScout24
async function extractSinglePageAutoScout24Data(
  searchUrl: string,
  sendLog: (message: string) => void,
  sendProgress: (value: number) => void,
  sendResults: (vehicles: any[]) => void,
  sendError: (message: string) => void,
  sendComplete: () => void,
) {
  // Réutiliser la fonction multi-pages mais avec maxPages = 1
  try {
    // Modifier l'URL pour s'assurer qu'elle pointe vers la page 1
    const url = searchUrl.includes("page=")
      ? searchUrl.replace(/page=\d+/, "page=1")
      : searchUrl + (searchUrl.includes("?") ? "&page=1" : "?page=1")

    sendLog("Mode extraction page unique activé")
    sendLog(`URL: ${url}`)

    // Appeler la fonction multi-pages avec la même URL mais en limitant à 1 page
    await extractMultiPageAutoScout24Data(url, sendLog, sendProgress, sendResults, sendError, sendComplete)
  } catch (error) {
    sendError(`Erreur lors de l'extraction en mode page unique: ${(error as Error).message}`)
  }
}
