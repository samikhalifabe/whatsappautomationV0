import { NextResponse } from "next/server"
import axios from "axios"

export async function POST(request) {
  try {
    const body = await request.json()
    const { data } = await axios.post("http://localhost:3001/api/send-message", body)
    return NextResponse.json(data)
  } catch (error) {
    console.error("Erreur proxy send:", error)
    return NextResponse.json({ error: "Erreur lors de l'envoi du message" }, { status: 500 })
  }
}
