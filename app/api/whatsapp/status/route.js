import { NextResponse } from "next/server"
import axios from "axios"

export async function GET() {
  try {
    console.log("API route /api/whatsapp/status appelée")
    const { data } = await axios.get("http://localhost:3001/api/status")
    console.log("Réponse du serveur WhatsApp:", data)
    return NextResponse.json(data)
  } catch (error) {
    console.error("Erreur proxy status:", error)
    return NextResponse.json(
      { error: "Erreur lors de la connexion au serveur WhatsApp", status: "error" },
      { status: 500 },
    )
  }
}
