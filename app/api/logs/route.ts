import { type NextRequest, NextResponse } from "next/server"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

export const dynamic = "force-dynamic"

// Fonction pour récupérer les logs du serveur WhatsApp
async function getWhatsAppServerLogs() {
  try {
    // Exécuter la commande pour récupérer les logs du serveur WhatsApp
    // Nous utilisons la commande 'tail' pour récupérer les dernières lignes du fichier de logs
    // Si le serveur WhatsApp n'utilise pas de fichier de logs, nous pouvons utiliser 'ps' pour voir si le processus est en cours d'exécution
    const { stdout } = await execAsync('ps aux | grep "node server.js" | grep -v grep')

    // Vérifier si le serveur WhatsApp est en cours d'exécution
    const isRunning = stdout.trim().length > 0

    return {
      isRunning,
      logs: isRunning
        ? "Le serveur WhatsApp est en cours d'exécution. Les logs sont disponibles dans le terminal où le serveur est exécuté."
        : "Le serveur WhatsApp n'est pas en cours d'exécution.",
    }
  } catch (error) {
    console.error("Erreur lors de la récupération des logs du serveur WhatsApp:", error)
    return {
      isRunning: false,
      logs: "Erreur lors de la récupération des logs du serveur WhatsApp.",
    }
  }
}

// Fonction pour récupérer les logs de l'application Next.js
async function getNextJsLogs() {
  try {
    // Récupérer les logs de l'application Next.js
    // Next.js écrit ses logs dans la console, nous ne pouvons pas les récupérer directement
    // Nous pouvons vérifier si l'application Next.js est en cours d'exécution
    const { stdout } = await execAsync('ps aux | grep "next" | grep -v grep')

    // Vérifier si l'application Next.js est en cours d'exécution
    const isRunning = stdout.trim().length > 0

    return {
      isRunning,
      logs: isRunning
        ? "L'application Next.js est en cours d'exécution. Les logs sont disponibles dans le terminal où l'application est exécutée."
        : "L'application Next.js n'est pas en cours d'exécution.",
    }
  } catch (error) {
    console.error("Erreur lors de la récupération des logs de l'application Next.js:", error)
    return {
      isRunning: false,
      logs: "Erreur lors de la récupération des logs de l'application Next.js.",
    }
  }
}

// Fonction pour récupérer les logs du système
async function getSystemLogs() {
  try {
    // Récupérer les informations système
    const { stdout: uptimeOutput } = await execAsync("uptime")
    const { stdout: memoryOutput } = await execAsync("free -h")
    const { stdout: diskOutput } = await execAsync('df -h | grep "/$"')

    return {
      uptime: uptimeOutput.trim(),
      memory: memoryOutput.trim(),
      disk: diskOutput.trim(),
    }
  } catch (error) {
    console.error("Erreur lors de la récupération des logs système:", error)
    return {
      uptime: "Erreur lors de la récupération de l'uptime.",
      memory: "Erreur lors de la récupération de la mémoire.",
      disk: "Erreur lors de la récupération de l'espace disque.",
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    // Récupérer les logs du serveur WhatsApp et de l'application Next.js
    const whatsappLogs = await getWhatsAppServerLogs()
    const nextjsLogs = await getNextJsLogs()
    const systemLogs = await getSystemLogs()

    // Retourner les logs
    return NextResponse.json({
      whatsapp: whatsappLogs,
      nextjs: nextjsLogs,
      system: systemLogs,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Erreur lors de la récupération des logs:", error)
    return NextResponse.json({ error: "Erreur lors de la récupération des logs" }, { status: 500 })
  }
}
