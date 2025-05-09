import { NextResponse } from "next/server"
import axios from "axios"

export async function GET() {
  try {
    const { data } = await axios.get("http://localhost:3001/api/qrcode")
    return NextResponse.json(data)
  } catch (error) {
    console.error("Erreur proxy qrcode:", error)
    return NextResponse.json({ error: "Erreur lors de la récupération du QR code" }, { status: 500 })
  }
}
