//the obj that the server return
export type Order = {
  bread: string | null
  size: string | null
  protein: string | null
  cheese: string | null
  veggies: string[] | null
  sauce: string[] | null
  name: string | null
  pickup_time: string | null
}

export type ChatResponse = {
  reply: string
  session_id: string
  status: "idle" | "building" | "confirming" | "complete"
  step: string | null
  order: Order
  total: number
  order_id: string | null
}

//take message and send to chatbot living in server//
export async function sendChat(
  message: string | Blob,
  sessionId?: string,
  accountId?: string
): Promise<ChatResponse> {
  //check message type first//
  const body = typeof message === "string"
    ? { message: message, session_id: sessionId, ...(accountId ? { account_id: accountId } : {}) }
    : {
        audio: await blobToBase64(message),
        mime_type: message.type,
        session_id: sessionId,
        ...(accountId ? { account_id: accountId } : {}),
      }

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  const data = await response.json()

  if(!response.ok){
    throw new Error(data.error ?? "Fail to send message to chatbot")
  }

  return data
}

//turn recorded audio into base64 text so it can go inside JSON//
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(String(reader.result).split(",")[1])
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}