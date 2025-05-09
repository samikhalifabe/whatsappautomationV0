"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { QRCodeCanvas } from "qrcode.react"

const WhatsAppInterface = () => {
  const [qrCode, setQrCode] = useState("")
  const [status, setStatus] = useState("disconnected")
  const [number, setNumber] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const BASE_URL = "http://localhost:3001/api"

  useEffect(() => {
    // Vérifier le statut
    const checkStatus = async () => {
      console.log("Vérification du statut...")
      try {
        const { data } = await axios.get(`${BASE_URL}/status`)
        console.log("Réponse du statut:", data)
        setStatus(data.status)

        // Si déconnecté, essayer d'obtenir le QR code
        if (data.status === "disconnected") {
          fetchQrCode()
        }
      } catch (error) {
        console.error("Erreur de statut:", error)
      }
    }

    checkStatus()
    const interval = setInterval(checkStatus, 10000)

    return () => clearInterval(interval)
  }, [])

  const fetchQrCode = async () => {
    try {
      const { data } = await axios.get(`${BASE_URL}/qrcode`)
      if (data.qrcode) {
        setQrCode(data.qrcode)
      }
    } catch (error) {
      console.error("Erreur QR code:", error)
    }
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)

    try {
      const { data } = await axios.post(`${BASE_URL}/send-message`, {
        number,
        message,
      })

      setResult({
        success: true,
        message: `Message envoyé avec succès! ID: ${data.messageId}`,
      })

      // Réinitialiser les champs
      setMessage("")
    } catch (error) {
      setResult({
        success: false,
        message: error.response?.data?.error || "Erreur lors de l'envoi du message",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="whatsapp-interface">
      <h1>Interface WhatsApp</h1>

      <div className="status">
        <p>
          Statut: <strong>{status}</strong>
        </p>
      </div>

      {status === "disconnected" && qrCode && (
        <div className="qr-section">
          <h2>Scannez ce QR code avec WhatsApp sur votre téléphone</h2>
          <QRCodeCanvas value={qrCode} size={256} />
        </div>
      )}

      {status === "connected" && (
        <div className="message-form">
          <h2>Envoyer un message</h2>
          <form onSubmit={sendMessage}>
            <div>
              <label>Numéro (format international sans +):</label>
              <input
                type="text"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="33612345678"
                required
              />
            </div>

            <div>
              <label>Message:</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Votre message..."
                required
              />
            </div>

            <button type="submit" disabled={loading}>
              {loading ? "Envoi..." : "Envoyer"}
            </button>
          </form>

          {result && <div className={`result ${result.success ? "success" : "error"}`}>{result.message}</div>}
        </div>
      )}

      <style jsx>{`
        .whatsapp-interface {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        
        .qr-section {
          text-align: center;
          margin: 30px 0;
        }
        
        .message-form form {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        
        .message-form input, 
        .message-form textarea {
          width: 100%;
          padding: 10px;
          margin-top: 5px;
        }
        
        .message-form textarea {
          min-height: 100px;
        }
        
        .message-form button {
          padding: 10px 15px;
          background: #25D366;
          color: white;
          border: none;
          cursor: pointer;
        }
        
        .message-form button:disabled {
          background: #cccccc;
        }
        
        .result {
          margin-top: 15px;
          padding: 10px;
          border-radius: 5px;
        }
        
        .success {
          background-color: #d4edda;
          color: #155724;
        }
        
        .error {
          background-color: #f8d7da;
          color: #721c24;
        }
      `}</style>
    </div>
  )
}

export default WhatsAppInterface
