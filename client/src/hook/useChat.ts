import { useState } from "react"
import { sendChat } from "../api/chat"

export function useChat() {
  const [sessionId, setSessionId] = useState<string>()
  const [replies, setReplies] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  async function sendMessage(message: string | Blob) {
    setError(null)
    try {
      const data = await sendChat(message, sessionId)
      setSessionId(data.session_id)
      setReplies((prev) => [...prev, data.reply])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong when sending your message to the server...")
    }
  }

  return { replies, error, sendMessage }
}
