import axios from "axios"

export async function GET(req) {
  try {
    const { data } = await axios.get("http://localhost:3001/api/status")
    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("Erreur proxy:", error)
    return new Response(JSON.stringify({ error: "Erreur lors de la connexion au serveur WhatsApp" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
