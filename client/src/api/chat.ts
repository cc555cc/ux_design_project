//the obj that the server return
export type Order = {
  bread: string | null
  size: string | null
  protein: string | null
  cheese: string | null
  veggies: string[] | null
  sauce: string | null
  name: string | null
  pickup_time: string | null
}

export type ChatResponse = {
  reply: string
  session_id: string
  status: "idle" | "building"
  step: string | null
  order: Order
  total: number
  order_id: string | null
}

//take message and send to chatbot living in server//
export async function sendChat(message: string, sessionId?: string): Promise<ChatResponse> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({message, session_id: sessionId}),
  })

  const data = await response.json()

  if(!response.ok){
    throw new Error(data.error ?? "Fail to send message to chatbot")
  }

  return data
}