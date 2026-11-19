import { useEffect, useMemo, useRef, useState } from "react"

const productOptions = ["Bread", "Protein", "Cheese", "Veggies", "Sauce"] as const
type ProductOption = (typeof productOptions)[number]

type ToppingOption = {
  name: string
  color: string
  category: ProductOption
  image: string
}

const toppingOptions: ToppingOption[] = [
  { name: "Italian Herbs", color: "#dcbf86", category: "Bread", image: "/toppings/italian-herbs.jpg" },
  { name: "Wheat", color: "#c28f4d", category: "Bread", image: "/toppings/wheat.jpg" },
  { name: "Honey Oat", color: "#debb76", category: "Bread", image: "/toppings/honey-oat.jpg" },
  { name: "Turkey", color: "#cc9d6d", category: "Protein", image: "/toppings/turkey.jpg" },
  { name: "Roast Beef", color: "#8c4f3d", category: "Protein", image: "/toppings/roast-beef.jpg" },
  { name: "Chicken", color: "#d4a772", category: "Protein", image: "/toppings/chicken.jpg" },
  { name: "Cheddar", color: "#e7b839", category: "Cheese", image: "/toppings/cheddar.jpg" },
  { name: "Swiss", color: "#f1da78", category: "Cheese", image: "/toppings/swiss.jpg" },
  { name: "Provolone", color: "#f2dd9c", category: "Cheese", image: "/toppings/provolone.jpg" },
  { name: "Lettuce", color: "#7bbf68", category: "Veggies", image: "/toppings/lettuce.jpg" },
  { name: "Tomato", color: "#d7482d", category: "Veggies", image: "/toppings/tomato.jpg" },
  { name: "Cucumber", color: "#8dcf64", category: "Veggies", image: "/toppings/cucumber.jpg" },
  { name: "Red onion", color: "#d26471", category: "Veggies", image: "/toppings/red-onion.jpg" },
  { name: "Green peppers", color: "#356a38", category: "Veggies", image: "/toppings/green-peppers.jpg" },
  { name: "Black olives", color: "#393939", category: "Veggies", image: "/toppings/black-olives.jpg" },
  { name: "Mayo", color: "#f5e8bf", category: "Sauce", image: "/toppings/mayo.jpg" },
  { name: "Chipotle", color: "#b5573f", category: "Sauce", image: "/toppings/chipotle.jpg" },
  { name: "Ranch", color: "#e7e1cf", category: "Sauce", image: "/toppings/ranch.jpg" },
]

const basePrice = 9.5
const extraIngredientPrice = 0.45
const maxIngredientPortions = 8
type ToppingAmounts = Record<string, number>

const emptyToppingAmounts: ToppingAmounts = Object.fromEntries(
  toppingOptions.map((option) => [option.name, 0])
)

type ChatRole = "user" | "assistant"

type ChatMessage = {
  role: ChatRole
  text: string
}

type ChatbotOrderState = {
  bread: string | null
  size: string | null
  protein: string | null
  cheese: string | null
  veggies: string[] | null
  sauce: string[] | null
  name: string | null
  pickup_time: string | null
}

type ChatbotResponse = {
  reply?: string
  session_id: string
  status?: "idle" | "building" | "confirming" | "complete"
  step: string | null
  total: number
  order: ChatbotOrderState
  error?: string
}

type RecognitionEvent = {
  results: ArrayLike<{ 0: { transcript: string } }>
}

type RecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onstart: (() => void) | null
  onend: (() => void) | null
  onerror: ((event: { error: string }) => void) | null
  onresult: ((event: RecognitionEvent) => void) | null
  start: () => void
  stop: () => void
}

type SpeechWindow = Window & {
  SpeechRecognition?: new () => RecognitionLike
  webkitSpeechRecognition?: new () => RecognitionLike
}

type CartItem = {
  id: string
  summary: string
  size: string
  quantity: number
  total: number
  toppingAmounts: ToppingAmounts
}

const draftStorageKey = "long-story-order-draft-v1"
const cartStorageKey = "long-story-cart-v1"

const serverToLocalNameMap: Record<string, string> = {
  "whole wheat": "Wheat",
  italian: "Italian Herbs",
  "honey oat": "Honey Oat",
}

const stepToCategoryMap: Record<string, ProductOption> = {
  bread: "Bread",
  protein: "Protein",
  cheese: "Cheese",
  veggies: "Veggies",
  sauce: "Sauce",
}

function mapServerNameToLocal(value: string): string {
  const normalized = value.trim().toLowerCase()
  if (serverToLocalNameMap[normalized]) return serverToLocalNameMap[normalized]

  const direct = toppingOptions.find((option) => option.name.toLowerCase() === normalized)
  if (direct) return direct.name

  const partial = toppingOptions.find(
    (option) => normalized.includes(option.name.toLowerCase()) || option.name.toLowerCase().includes(normalized)
  )

  return partial?.name ?? value
}

function selectedToppingsFromServerOrder(order: ChatbotOrderState): string[] {
  const selections = new Set<string>()
  const singleValueFields = [order.bread, order.protein, order.cheese]

  for (const value of singleValueFields) {
    if (!value || value.toLowerCase() === "none") continue
    selections.add(mapServerNameToLocal(value))
  }

  for (const value of order.veggies ?? []) {
    selections.add(mapServerNameToLocal(value))
  }

  for (const value of order.sauce ?? []) {
    selections.add(mapServerNameToLocal(value))
  }

  return [...selections].filter((value) => toppingOptions.some((option) => option.name === value))
}

function titleForCategory(category: ProductOption): string {
  switch (category) {
    case "Bread":
      return "Choose your foundation."
    case "Protein":
      return "Pick your protein."
    case "Cheese":
      return "Melt in the flavor."
    case "Veggies":
      return "Bring on the crunch."
    case "Sauce":
      return "Finish with sauce."
    default:
      return "Build your sub."
  }
}

function OrderSection() {
  const [activeCategory, setActiveCategory] = useState<ProductOption>("Bread")
  const [toppingAmounts, setToppingAmounts] = useState<ToppingAmounts>(() => ({ ...emptyToppingAmounts }))
  const [sandwichSize, setSandwichSize] = useState("6-inch")
  const [quantity, setQuantity] = useState(1)
  const [addedCount, setAddedCount] = useState(0)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState("")
  const [chatSessionId, setChatSessionId] = useState<string | null>(null)
  const [chatLoading, setChatLoading] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)
  const [chatTotal, setChatTotal] = useState<number | null>(null)
  const [orderError, setOrderError] = useState<string | null>(null)
  const [undoSnapshot, setUndoSnapshot] = useState<ToppingAmounts | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [heardText, setHeardText] = useState("")
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null)
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [pickupName, setPickupName] = useState("")
  const [pickupTime, setPickupTime] = useState("")
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null)
  const initRef = useRef(false)
  const recognitionRef = useRef<RecognitionLike | null>(null)

  const visibleToppings = useMemo(
    () => toppingOptions.filter((option) => option.category === activeCategory),
    [activeCategory]
  )

  const selectedNames = useMemo(
    () =>
      toppingOptions
        .filter((option) => toppingAmounts[option.name] > 0)
        .map((option) => `${option.name}${toppingAmounts[option.name] > 1 ? ` × ${toppingAmounts[option.name]}` : ""}`),
    [toppingAmounts]
  )

  const selectedOptions = useMemo(
    () => toppingOptions.filter((option) => toppingAmounts[option.name] > 0),
    [toppingAmounts]
  )

  const selectedIngredientCount = useMemo(
    () => Object.values(toppingAmounts).reduce((total, amount) => total + amount, 0),
    [toppingAmounts]
  )

  const previewLayers = useMemo(() => {
    const categoryOrder: ProductOption[] = ["Sauce", "Cheese", "Protein", "Veggies"]
    return categoryOrder
      .flatMap((category) =>
        selectedOptions
          .filter((option) => option.category === category)
          .flatMap((option) => Array.from({ length: toppingAmounts[option.name] }, () => option))
      )
      .slice(0, 8)
  }, [selectedOptions, toppingAmounts])

  const breadPreviewImage = useMemo(
    () =>
      selectedOptions.find((option) => option.category === "Bread")?.image ?? null,
    [selectedOptions]
  )

  const totalPrice = useMemo(() => {
    const singleSub = basePrice + selectedIngredientCount * extraIngredientPrice
    return singleSub * quantity
  }, [quantity, selectedIngredientCount])
  const displayTotal = chatTotal ?? totalPrice

  const confirmationText =
    addedCount === 0
      ? "Ready when you are."
      : `Added ${quantity} sub${quantity > 1 ? "s" : ""} to bag (${addedCount} total item${addedCount > 1 ? "s" : ""}).`

  const proteinSummary = useMemo(
    () => selectedOptions.find((option) => option.category === "Protein")?.name ?? "Custom sub",
    [selectedOptions]
  )
  const lastAssistantMessage = useMemo(
    () =>
      [...chatMessages].reverse().find((message) => message.role === "assistant")?.text ??
      "What would you like on your sandwich?",
    [chatMessages]
  )
  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0)
  const cartTotal = cartItems.reduce((total, item) => total + item.total, 0)
  const assistantStatus = chatLoading
    ? "Processing your request..."
    : isListening
      ? "Listening..."
      : isSpeaking
        ? "Speaking..."
        : chatError
          ? "Needs attention"
          : "Ready for you"
  const hasBread = selectedOptions.some((option) => option.category === "Bread")
  const hasFilling = selectedOptions.some((option) => option.category !== "Bread")
  const speechWindow = window as SpeechWindow
  const SpeechRecognitionConstructor =
    speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition
  const voiceSupported = Boolean(SpeechRecognitionConstructor)

  function clearPreview() {
    setToppingAmounts({ ...emptyToppingAmounts })
    setSandwichSize("6-inch")
    setActiveCategory("Bread")
    setQuantity(1)
    setAddedCount(0)
    setChatTotal(null)
    setOrderError(null)
    setUndoSnapshot(null)
    setLastFailedMessage(null)
    setCheckoutMessage(null)
    setHeardText("")
    localStorage.removeItem(draftStorageKey)
  }

  function applyChatState(response: ChatbotResponse) {
    setChatSessionId(response.session_id)
    setChatTotal(typeof response.total === "number" ? response.total : null)

    if (response.status === "idle") {
      clearPreview()
      return
    }

    if (response.order) {
      const mappedSelections = selectedToppingsFromServerOrder(response.order)
      const nextAmounts = { ...emptyToppingAmounts }
      for (const name of mappedSelections.slice(0, maxIngredientPortions)) nextAmounts[name] = 1
      setToppingAmounts(nextAmounts)
      setUndoSnapshot(null)
      if (response.order.size) setSandwichSize(response.order.size)
      if (response.order.name) setPickupName(response.order.name)
      if (response.order.pickup_time) setPickupTime(response.order.pickup_time)
    }

    if (response.step && stepToCategoryMap[response.step]) {
      setActiveCategory(stepToCategoryMap[response.step])
    }
  }

  async function resetChatSession() {
    clearPreview()
    setChatLoading(true)
    setChatError(null)
    try {
      const payload: Record<string, string> = {}
      if (chatSessionId) payload.session_id = chatSessionId

      const response = await fetch("/api/chat/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = (await response.json()) as ChatbotResponse
      if (!response.ok) throw new Error(data.error ?? "Could not reset chat.")

      applyChatState(data)
      setChatMessages(data.reply ? [{ role: "assistant", text: data.reply }] : [])
      setChatInput("")
    } catch (error) {
      setChatError(error instanceof Error ? error.message : "Unable to connect to chatbot server.")
    } finally {
      setChatLoading(false)
    }
  }

  async function cancelCurrentOrder() {
    if (chatLoading) return
    if (
      selectedIngredientCount > 0 &&
      !window.confirm("Start over and clear every ingredient from this order?")
    ) {
      return
    }
    clearPreview()
    setChatMessages([])
    setChatInput("")
    await resetChatSession()
  }

  async function sendChatMessage(overrideMessage?: string) {
    const message = (overrideMessage ?? chatInput).trim()
    if (!message || chatLoading) return

    setChatMessages((current) => [...current, { role: "user", text: message }])
    setChatInput("")
    setChatLoading(true)
    setChatError(null)
    setLastFailedMessage(null)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, session_id: chatSessionId ?? undefined }),
      })

      const data = (await response.json()) as ChatbotResponse
      if (!response.ok) throw new Error(data.error ?? "Chat request failed.")

      applyChatState(data)
      const botReply = data.reply
      if (botReply) {
        setChatMessages((current) => [...current, { role: "assistant", text: botReply }])
      }
    } catch (error) {
      setChatError(error instanceof Error ? error.message : "Unable to send message.")
      setLastFailedMessage(message)
    } finally {
      setChatLoading(false)
    }
  }

  function adjustToppingAmount(name: string, delta: number) {
    setToppingAmounts((current) => {
      const currentTotal = Object.values(current).reduce((total, amount) => total + amount, 0)
      if (delta > 0 && currentTotal >= maxIngredientPortions) return current
      setUndoSnapshot({ ...current })

      return {
        ...current,
        [name]: Math.min(3, Math.max(0, (current[name] ?? 0) + delta)),
      }
    })
    setChatTotal(null)
    setOrderError(null)
  }

  function undoLastChange() {
    if (!undoSnapshot) return
    setToppingAmounts(undoSnapshot)
    setUndoSnapshot(null)
    setChatTotal(null)
    setOrderError(null)
  }

  function addCurrentOrderToBag() {
    if (!hasBread) {
      setOrderError("Choose a bread before adding this sub to the bag.")
      setActiveCategory("Bread")
      return
    }

    if (!hasFilling) {
      setOrderError("Add at least one ingredient before continuing.")
      return
    }

    const item: CartItem = {
      id: crypto.randomUUID(),
      summary: selectedNames.join(", "),
      size: sandwichSize,
      quantity,
      total: displayTotal,
      toppingAmounts: { ...toppingAmounts },
    }
    setCartItems((current) => [...current, item])
    setAddedCount((count) => count + quantity)
    setCartOpen(true)
    setOrderError(null)
  }

  function startListening() {
    if (!SpeechRecognitionConstructor || chatLoading) return
    recognitionRef.current?.stop()
    const recognition = new SpeechRecognitionConstructor()
    recognition.lang = "en-US"
    recognition.continuous = false
    recognition.interimResults = false
    recognition.onstart = () => {
      setIsListening(true)
      setChatError(null)
      setHeardText("")
    }
    recognition.onend = () => setIsListening(false)
    recognition.onerror = (event) => {
      setIsListening(false)
      setChatError(
        event.error === "not-allowed"
          ? "Microphone access was blocked. You can keep typing instead."
          : "I couldn't hear that. Please try speaking again or type your order."
      )
    }
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim()
      if (transcript) {
        setHeardText(transcript)
        setChatInput(transcript)
      }
    }
    recognitionRef.current = recognition
    recognition.start()
  }

  function stopListening() {
    recognitionRef.current?.stop()
    setIsListening(false)
  }

  function speakLastResponse() {
    if (!("speechSynthesis" in window) || isSpeaking) return
    const utterance = new SpeechSynthesisUtterance(lastAssistantMessage)
    utterance.rate = 0.95
    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => {
      setIsSpeaking(false)
      setChatError("Audio playback failed. The response is still available as text.")
    }
    window.speechSynthesis.speak(utterance)
  }

  function stopSpeaking() {
    window.speechSynthesis.cancel()
    setIsSpeaking(false)
  }

  function removeCartItem(id: string) {
    setCartItems((current) => current.filter((item) => item.id !== id))
    setCheckoutMessage(null)
  }

  function editCartItem(item: CartItem) {
    setToppingAmounts({ ...emptyToppingAmounts, ...item.toppingAmounts })
    setSandwichSize(item.size)
    setQuantity(item.quantity)
    setCartItems((current) => current.filter((entry) => entry.id !== item.id))
    setCartOpen(false)
    setCheckoutMessage(null)
  }

  function completeCheckout() {
    if (cartItems.length === 0) return
    if (!pickupName.trim()) {
      setCheckoutMessage("Add a pickup name before confirming.")
      return
    }
    if (!pickupTime.trim()) {
      setCheckoutMessage("Add a pickup time before confirming.")
      return
    }

    const confirmation = `Order confirmed for ${pickupName.trim()} at ${pickupTime.trim()}.`
    setCartItems([])
    setAddedCount(0)
    setCartOpen(false)
    clearPreview()
    setCheckoutMessage(confirmation)
  }

  useEffect(() => {
    if (initRef.current) return
    initRef.current = true

    try {
      const savedCart = localStorage.getItem(cartStorageKey)
      if (savedCart) {
        const parsed = JSON.parse(savedCart) as CartItem[]
        if (Array.isArray(parsed)) setCartItems(parsed)
      }
    } catch {
      localStorage.removeItem(cartStorageKey)
    }

    const restore = async () => {
      const savedDraft = localStorage.getItem(draftStorageKey)
      if (!savedDraft) {
        await resetChatSession()
        return
      }

      try {
        const draft = JSON.parse(savedDraft) as {
          toppingAmounts?: ToppingAmounts
          sandwichSize?: string
          quantity?: number
          chatMessages?: ChatMessage[]
          chatSessionId?: string | null
          pickupName?: string
          pickupTime?: string
        }
        setToppingAmounts({ ...emptyToppingAmounts, ...(draft.toppingAmounts ?? {}) })
        setSandwichSize(draft.sandwichSize ?? "6-inch")
        setQuantity(Math.max(1, draft.quantity ?? 1))
        setChatMessages(Array.isArray(draft.chatMessages) ? draft.chatMessages : [])
        setChatSessionId(draft.chatSessionId ?? null)
        setPickupName(draft.pickupName ?? "")
        setPickupTime(draft.pickupTime ?? "")

        if (draft.chatSessionId) {
          const response = await fetch(`/api/session?session_id=${encodeURIComponent(draft.chatSessionId)}`)
          if (response.ok) {
            const state = (await response.json()) as ChatbotResponse
            if (state.status === "idle") {
              setChatSessionId(state.session_id)
              setChatError("The assistant session expired. Your local draft was preserved, so you can continue.")
            } else {
              applyChatState(state)
            }
          } else {
            await resetChatSession()
          }
        }
      } catch {
        localStorage.removeItem(draftStorageKey)
        await resetChatSession()
      }
    }

    void restore()
  }, [])

  useEffect(() => {
    if (!initRef.current) return
    const draft = {
      toppingAmounts,
      sandwichSize,
      quantity,
      chatMessages,
      chatSessionId,
      pickupName,
      pickupTime,
    }
    localStorage.setItem(draftStorageKey, JSON.stringify(draft))
  }, [toppingAmounts, sandwichSize, quantity, chatMessages, chatSessionId, pickupName, pickupTime])

  useEffect(() => {
    localStorage.setItem(cartStorageKey, JSON.stringify(cartItems))
  }, [cartItems])

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop()
      window.speechSynthesis?.cancel()
    }
  }, [])

  return (
    <section className="order-section">
      <style>{`
        * { box-sizing: border-box; }
        .order-section {
          --bg: #f4f0ec;
          --panel: #f9f6f3;
          --panel-strong: #f0e7e1;
          --text: #2b2a2d;
          --line: #d8cfc5;
          --shadow: rgba(47, 41, 35, 0.08);
          min-height: 100vh;
          background: var(--bg);
          font-family: Inter, "Segoe UI", sans-serif;
          color: var(--text);
          padding: calc(10vh + 18px) 18px 32px;
        }

        .order-shell { max-width: 1150px; margin: 0 auto; border-radius: 18px; }

        .order-card { background: rgba(255,255,255,0.35); border: 1px solid var(--line); border-radius: 22px; box-shadow: 0 16px 36px var(--shadow); overflow: hidden; }
        .layout { display: grid; grid-template-columns: 1.38fr 1fr; gap: 18px; min-height: 500px; }
        .product-panel { background: var(--panel-strong); border-right: 1px solid var(--line); padding: 18px 18px 16px; display: flex; flex-direction: column; }
        .panel-label { display: flex; align-items: center; justify-content: space-between; color: #7f716c; text-transform: uppercase; font-size: 0.72rem; letter-spacing: 0.12em; margin-bottom: 6px; }
        .panel-label .mini-pill { border: 1px solid var(--line); border-radius: 999px; padding: 4px 7px; background: rgba(255,255,255,0.38); }
        .start-over-button { border: 1px solid rgba(69,56,49,0.16); border-radius: 999px; padding: 5px 10px; background: rgba(255,255,255,0.55); color: #5b504a; font-size: 0.66rem; font-weight: 700; text-transform: none; letter-spacing: normal; cursor: pointer; }
        .start-over-button:disabled { opacity: 0.5; cursor: not-allowed; }
        .product-panel h1 { margin: 4px 0 0; font-size: clamp(1.8rem, 3vw, 2.6rem); line-height: 1.05; letter-spacing: -0.06em; font-weight: 700; color: #2e2b2a; }
        .image-stage { margin-top: 16px; border-radius: 18px; background: linear-gradient(180deg, #dcc8b3, #c4b29d); position: relative; min-height: 300px; overflow: hidden; box-shadow: inset 0 0 0 1px rgba(0,0,0,0.04); padding: 16px; }
        .sandwich-build { width: min(560px, 100%); margin: 0 auto; display: flex; flex-direction: column; align-items: center; gap: 7px; }
        .bun {
          width: 88%;
          background-size: cover;
          background-position: center;
          box-shadow: 0 6px 12px rgba(40, 26, 17, 0.2);
          border: 1px solid rgba(126, 80, 36, 0.2);
        }
        .bun-top { height: 64px; border-radius: 52px 52px 34px 34px; }
        .bun-bottom { height: 46px; border-radius: 24px 24px 34px 34px; }
        .ingredient-stack {
          width: 82%;
          max-height: 150px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          gap: 5px;
          padding: 3px 0;
        }
        .ingredient-layer {
          height: 24px;
          border-radius: 999px;
          background-size: cover;
          background-position: center;
          box-shadow: 0 1px 4px rgba(0,0,0,0.2);
          display: flex;
          align-items: center;
          justify-content: flex-start;
          padding: 0 10px;
        }
        .ingredient-layer span {
          font-size: 0.64rem;
          font-weight: 700;
          color: #fff;
          text-shadow: 0 1px 2px rgba(0,0,0,0.75);
        }
        .ingredient-placeholder {
          height: 48px;
          border-radius: 18px;
          display: grid;
          place-items: center;
          color: #4f463f;
          border: 1px dashed rgba(66, 54, 42, 0.35);
          background: rgba(255,255,255,0.3);
          font-size: 0.72rem;
          font-weight: 600;
        }
        .preview-meta {
          margin-top: 8px;
          text-align: center;
          font-size: 0.72rem;
          color: #5f5551;
        }

        .builder-panel { background: rgba(255,255,255,0.18); padding: 20px 18px 16px; }
        .builder-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .builder-title { margin: 0; font-size: clamp(1.5rem, 2vw, 2.3rem); line-height: 1.1; letter-spacing: -0.05em; font-weight: 700; }
        .builder-tabs { display: flex; gap: 10px; list-style: none; margin: 0 0 18px; padding: 0; flex-wrap: wrap; }
        .tab-button { border: 1px solid transparent; border-radius: 999px; color: #685f5d; background: rgba(255,255,255,0.2); font-size: 0.75rem; font-weight: 600; padding: 8px 14px; cursor: pointer; transition: all 0.2s ease; }
        .tab-button.active { background: #1d1d1d; color: white; border-color: rgba(0,0,0,0.08); }

        .topping-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-top: 8px; }
        .topping-item { background: rgba(255,255,255,0.32); border: 1px solid rgba(95,79,69,0.1); border-radius: 12px; padding: 10px 8px 8px; text-align: center; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 8px; min-height: 118px; }
        .topping-item.selected { border-color: rgba(35, 32, 30, 0.25); box-shadow: 0 0 0 2px rgba(35, 32, 30, 0.08); }
        .topping-swatch { width: 42px; height: 42px; border-radius: 12px; border: 1px solid rgba(44, 37, 34, 0.08); overflow: hidden; background: #f2ece7; }
        .topping-swatch img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .topping-item .name { font-size: 0.66rem; color: #4e4a48; font-weight: 600; }
        .topping-stepper { display: flex; align-items: center; gap: 4px; padding: 3px; border: 1px solid rgba(0,0,0,0.08); border-radius: 999px; background: rgba(255,255,255,0.72); }
        .topping-stepper button { width: 24px; height: 24px; border: 0; border-radius: 50%; background: transparent; color: #403a37; font-size: 1rem; line-height: 1; cursor: pointer; }
        .topping-stepper button:hover:not(:disabled) { background: rgba(0,0,0,0.07); }
        .topping-stepper button:disabled { color: #b7afaa; cursor: not-allowed; }
        .topping-stepper .amount { min-width: 15px; text-align: center; font-size: 0.72rem; font-weight: 700; color: #403a37; }

        .builder-summary { margin-top: 16px; padding-top: 14px; border-top: 1px solid rgba(0,0,0,0.08); display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: 0.7rem; color: #625d5b; }
        .builder-summary-left { display: flex; align-items: center; gap: 8px; min-width: 0; }
        .undo-button { border: 1px solid rgba(0,0,0,0.1); border-radius: 999px; background: rgba(255,255,255,0.55); padding: 4px 8px; color: #4d4541; font-size: 0.68rem; font-weight: 700; cursor: pointer; }
        .undo-button:disabled { opacity: 0.45; cursor: not-allowed; }
        .summary-pill { display: inline-flex; align-items: center; gap: 7px; padding: 4px 8px; border: 1px solid rgba(80,72,69,0.1); border-radius: 999px; background: rgba(255,255,255,0.2); }
        .summary-pill strong { color: #272323; }
        .size-picker { display: flex; gap: 6px; margin-top: 8px; }
        .size-button { border: 1px solid rgba(0,0,0,0.1); border-radius: 999px; background: rgba(255,255,255,0.45); color: #554b46; padding: 5px 10px; font-size: 0.66rem; font-weight: 700; cursor: pointer; }
        .size-button.active { color: #fff; background: #292525; }

        .bottom-bar { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 18px; margin-top: 12px; align-items: end; }
        .chat-panel { background: rgba(255,255,255,0.35); border: 1px solid rgba(85,75,70,0.1); border-radius: 16px; padding: 12px; min-height: 215px; display: flex; flex-direction: column; gap: 10px; }
        .chat-top { display: flex; justify-content: space-between; gap: 12px; align-items: flex-end; }
        .chat-kicker { margin: 0 0 6px; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #5f5651; }
        .speech { position: relative; background: rgba(255,255,255,0.3); border: 2px solid #171414; border-radius: 18px 18px 18px 0; padding: 12px 18px 10px; max-width: 300px; box-shadow: 0 8px 18px rgba(30, 23, 17, 0.08); }
        .speech::before { content: ""; position: absolute; left: -11px; bottom: 12px; width: 18px; height: 18px; border-left: 2px solid #171414; border-bottom: 2px solid #171414; background: rgba(255,255,255,0.3); transform: rotate(35deg); border-radius: 0 0 0 8px; }
        .speech p { margin: 0; font-size: 0.9rem; line-height: 1.4; color: #443f3d; }
        .speech .tiny { font-size: 0.7rem; opacity: 0.85; margin-top: 8px; color: #5c544f; }
        .chat-side { display: flex; flex-direction: column; align-items: center; gap: 5px; }
        .avatar-status { font-size: 0.62rem; font-weight: 700; color: #625650; text-align: center; }
        .chat-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: linear-gradient(180deg, #f0d9c2, #d2a174);
          position: relative;
          box-shadow: inset 0 -8px 0 rgba(0,0,0,0.06);
        }
        .chat-avatar.processing { animation: avatarPulse 1.1s ease-in-out infinite; }
        .chat-avatar.error { box-shadow: 0 0 0 3px rgba(177,31,31,0.15), inset 0 -8px 0 rgba(0,0,0,0.06); }
        @keyframes avatarPulse { 50% { transform: scale(1.06); } }
        .chat-avatar::before {
          content: "";
          position: absolute;
          left: 11px;
          top: 12px;
          width: 22px;
          height: 18px;
          background: #f3c996;
          border-radius: 10px 10px 12px 12px;
        }
        .chat-avatar::after {
          content: "";
          position: absolute;
          left: 10px;
          bottom: 6px;
          width: 24px;
          height: 12px;
          background: #f7d0a3;
          border-radius: 12px;
          box-shadow: 0 -5px 0 0 #d75f42;
        }
        .chat-error { font-size: 0.72rem; color: #b11f1f; }
        .retry-button { border: 0; background: transparent; color: #9b1c1c; font-weight: 700; text-decoration: underline; cursor: pointer; padding: 0 0 0 4px; }
        .chat-form { display: flex; gap: 8px; }
        .chat-input { flex: 1; border: 1px solid rgba(0,0,0,0.15); border-radius: 999px; padding: 8px 12px; font-size: 0.75rem; background: rgba(255,255,255,0.9); }
        .chat-send { border: 0; border-radius: 999px; background: #23201f; color: #fff; font-size: 0.7rem; font-weight: 700; padding: 8px 12px; cursor: pointer; }
        .chat-send:disabled { opacity: 0.55; cursor: not-allowed; }
        .voice-controls { display: flex; align-items: center; gap: 6px; }
        .voice-button { border: 1px solid rgba(0,0,0,0.12); border-radius: 999px; background: rgba(255,255,255,0.62); color: #413a36; padding: 7px 10px; font-size: 0.68rem; font-weight: 700; cursor: pointer; }
        .voice-button:disabled { opacity: 0.48; cursor: not-allowed; }
        .heard-card { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 9px 10px; border: 1px solid rgba(0,0,0,0.1); border-radius: 12px; background: rgba(255,255,255,0.58); font-size: 0.7rem; color: #4c4541; }
        .heard-card strong { display: block; margin-bottom: 2px; color: #2e2926; }
        .heard-actions { display: flex; gap: 5px; }
        .platform-note { margin: 0; font-size: 0.62rem; font-weight: 700; color: #6a5e57; text-transform: uppercase; letter-spacing: 0.06em; }
        .chat-help { margin: 0; font-size: 0.66rem; line-height: 1.35; color: #6b605a; }
        .privacy-note { margin: 0; font-size: 0.62rem; line-height: 1.4; color: #746963; }

        .order-summary { background: rgba(255,255,255,0.18); border: 1px solid rgba(85,75,70,0.1); border-radius: 16px; padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
        .summary-meta { color: #554f4d; font-size: 0.72rem; letter-spacing: 0.08em; text-transform: uppercase; }
        .summary-main { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-top: 10px; }
        .summary-main .price { font-size: 2.1rem; letter-spacing: -0.06em; font-weight: 800; color: #1a1a1a; }
        .summary-main .price small { font-size: 0.8rem; color: #6a615d; font-weight: 600; letter-spacing: 0.03em; margin-left: 6px; }
        .qty-box { display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.3); border: 1px solid rgba(0,0,0,0.08); border-radius: 999px; padding: 6px 8px; font-weight: 700; color: #363433; }
        .operator { width: 28px; height: 28px; border-radius: 50%; border: 0; display: grid; place-items: center; background: rgba(0,0,0,0.06); cursor: pointer; font-size: 1rem; line-height: 1; }
        .operator:disabled { cursor: not-allowed; opacity: 0.45; }
        .cta-button { border: none; border-radius: 999px; background: linear-gradient(180deg, #1d1b1a, #2a2626); color: white; font-weight: 700; padding: 12px 22px; box-shadow: 0 12px 18px rgba(34, 29, 27, 0.16); cursor: pointer; }
        .confirmation { margin-top: 7px; font-size: 0.72rem; color: #625650; max-width: 220px; }
        .order-error { margin: 7px 0 0; font-size: 0.72rem; color: #a32626; max-width: 260px; }
        .cart-panel { margin-top: 10px; padding: 12px; border: 1px solid rgba(0,0,0,0.1); border-radius: 14px; background: rgba(255,255,255,0.48); }
        .cart-heading { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 0.78rem; }
        .cart-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 7px; }
        .cart-item { display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: start; padding: 8px; border-radius: 10px; background: rgba(255,255,255,0.58); font-size: 0.7rem; }
        .cart-item p { margin: 2px 0 0; color: #6b605a; }
        .cart-remove { border: 0; background: transparent; color: #a32626; font-size: 0.68rem; cursor: pointer; }
        .checkout-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px; }
        .checkout-input { border: 1px solid rgba(0,0,0,0.12); border-radius: 999px; padding: 8px 10px; background: rgba(255,255,255,0.86); font-size: 0.72rem; }
        .cart-total-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-top: 10px; font-size: 0.76rem; font-weight: 700; }
        .checkout-button { border: 0; border-radius: 999px; background: #d62a2a; color: #fff; padding: 8px 12px; font-size: 0.7rem; font-weight: 700; cursor: pointer; }
        .checkout-message { margin: 8px 0 0; font-size: 0.7rem; color: #695d57; }
        button:focus-visible, input:focus-visible { outline: 3px solid rgba(214,42,42,0.35); outline-offset: 2px; }

        @media (max-width: 980px) {
          .layout { grid-template-columns: 1fr; }
          .product-panel { border-right: none; border-bottom: 1px solid var(--line); }
          .bottom-bar { grid-template-columns: 1fr; }
        }

        @media (max-width: 700px) {
          .builder-tabs { justify-content: center; }
          .topping-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .summary-main { flex-direction: column; align-items: flex-start; }
          .image-stage { min-height: 270px; }
          .bun-top { height: 56px; }
          .bun-bottom { height: 42px; }
          .chat-top { flex-direction: column; align-items: flex-start; }
          .checkout-grid { grid-template-columns: 1fr; }
        }

        @media (prefers-reduced-motion: reduce) {
          .chat-avatar.processing { animation: none; }
        }
      `}</style>

      <div className="order-shell">
        <div className="order-card">
          <div className="layout">
            <div className="product-panel">
              <div className="panel-label">
                <span>Your sub order</span>
                <button
                  type="button"
                  className="start-over-button"
                  onClick={() => void cancelCurrentOrder()}
                  disabled={chatLoading}
                >
                  Cancel / start new
                </button>
              </div>
              <h1>Made just for you.</h1>

              <div className="image-stage" aria-label="Live sandwich preview">
                <div className="sandwich-build">
                  {breadPreviewImage ? (
                    <div className="bun bun-top" style={{ backgroundImage: `url(${breadPreviewImage})` }} />
                  ) : null}
                  <div className="ingredient-stack">
                    {previewLayers.length === 0 ? (
                      <div className="ingredient-placeholder">Select toppings to build your sandwich</div>
                    ) : (
                      previewLayers.map((item, index) => (
                        <div
                          key={`preview-${item.name}-${index}`}
                          className="ingredient-layer"
                          style={{
                            backgroundImage: `linear-gradient(rgba(35, 28, 23, 0.16), rgba(35, 28, 23, 0.16)), url(${item.image})`,
                          }}
                        >
                          <span>{item.name}</span>
                        </div>
                      ))
                    )}
                  </div>
                  {breadPreviewImage ? (
                    <div className="bun bun-bottom" style={{ backgroundImage: `url(${breadPreviewImage})` }} />
                  ) : null}
                </div>
                <div className="preview-meta">{previewLayers.length} ingredient layer{previewLayers.length === 1 ? "" : "s"} selected</div>
              </div>
            </div>

            <div className="builder-panel">
              <div className="builder-header">
                <h2 className="builder-title">{titleForCategory(activeCategory)}</h2>
              </div>

              <ul className="builder-tabs" aria-label="Build options">
                {productOptions.map((option) => (
                  <li key={option}>
                    <button
                      type="button"
                      className={`tab-button${activeCategory === option ? " active" : ""}`}
                      onClick={() => setActiveCategory(option)}
                    >
                      {option}
                    </button>
                  </li>
                ))}
              </ul>

              <div className="topping-grid">
                {visibleToppings.map((topping) => {
                  const amount = toppingAmounts[topping.name] ?? 0
                  const isSelected = amount > 0
                  return (
                    <div
                      key={topping.name}
                      className={`topping-item${isSelected ? " selected" : ""}`}
                    >
                      <div className="topping-swatch" aria-hidden="true">
                        <img src={topping.image} alt="" loading="lazy" />
                      </div>
                      <div className="topping-stepper" aria-label={`${topping.name} quantity`}>
                        <button
                          type="button"
                          onClick={() => adjustToppingAmount(topping.name, -1)}
                          disabled={amount === 0}
                          aria-label={`Remove one portion of ${topping.name}`}
                        >
                          −
                        </button>
                        <span className="amount" aria-live="polite">{amount}</span>
                        <button
                          type="button"
                          onClick={() => adjustToppingAmount(topping.name, 1)}
                          disabled={amount === 3 || selectedIngredientCount >= maxIngredientPortions}
                          aria-label={`Add one portion of ${topping.name}`}
                        >
                          +
                        </button>
                      </div>
                      <div className="name">{topping.name}</div>
                    </div>
                  )
                })}
              </div>

              <div className="builder-summary">
                <div className="builder-summary-left">
                  <span>{selectedNames.slice(0, 3).join(" · ") || "No ingredients selected"}</span>
                  <button
                    type="button"
                    className="undo-button"
                    onClick={undoLastChange}
                    disabled={!undoSnapshot}
                  >
                    Undo
                  </button>
                </div>
                <span className="summary-pill">
                  <strong>{selectedIngredientCount} / {maxIngredientPortions}</strong> portions
                </span>
              </div>
              <div className="size-picker" aria-label="Sandwich size">
                {["6-inch", "Footlong"].map((size) => (
                  <button
                    key={size}
                    type="button"
                    className={`size-button${sandwichSize === size ? " active" : ""}`}
                    onClick={() => setSandwichSize(size)}
                    aria-pressed={sandwichSize === size}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bottom-bar">
            <div className="chat-panel" aria-label="Order chatbot">
              <div className="chat-top">
                <div>
                  <p className="chat-kicker">A little help from the counter.</p>
                  <div className="speech">
                    <p aria-live="polite" aria-atomic="true">
                      {chatLoading ? "I’m working on that..." : lastAssistantMessage}
                    </p>
                    <div className="tiny">{selectedNames.length > 0 ? selectedNames.join(", ") : "Pick ingredients to start."}</div>
                  </div>
                </div>
                <div className="chat-side">
                  <div
                    className={`chat-avatar${chatLoading || isListening || isSpeaking ? " processing" : chatError ? " error" : ""}`}
                    aria-hidden="true"
                  />
                  <span className="avatar-status" role="status">{assistantStatus}</span>
                </div>
              </div>

              {chatError ? (
                <div className="chat-error" role="alert">
                  {chatError}
                  {lastFailedMessage ? (
                    <button type="button" className="retry-button" onClick={() => void sendChatMessage(lastFailedMessage)}>
                      Retry
                    </button>
                  ) : null}
                </div>
              ) : null}

              <form
                className="chat-form"
                onSubmit={(event) => {
                  event.preventDefault()
                  void sendChatMessage()
                }}
              >
                <input
                  aria-label="Order message"
                  className="chat-input"
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  placeholder="Type your order update..."
                  disabled={chatLoading}
                />
                <button type="submit" className="chat-send" disabled={chatLoading || chatInput.trim().length === 0}>
                  {chatLoading ? "Sending..." : "Send"}
                </button>
              </form>
              <div className="voice-controls" aria-label="Voice controls">
                <button
                  type="button"
                  className="voice-button"
                  onClick={isListening ? stopListening : startListening}
                  disabled={!voiceSupported || chatLoading}
                  aria-pressed={isListening}
                >
                  {isListening ? "Stop listening" : voiceSupported ? "Start listening" : "Voice unavailable"}
                </button>
                <button
                  type="button"
                  className="voice-button"
                  onClick={isSpeaking ? stopSpeaking : speakLastResponse}
                  disabled={!lastAssistantMessage}
                >
                  {isSpeaking ? "Stop speaking" : "Hear response"}
                </button>
              </div>
              {heardText ? (
                <div className="heard-card" role="status">
                  <div>
                    <strong>I heard:</strong>
                    <span>{heardText}</span>
                  </div>
                  <div className="heard-actions">
                    <button
                      type="button"
                      className="voice-button"
                      onClick={startListening}
                      disabled={isListening || chatLoading}
                    >
                      Try again
                    </button>
                    <button
                      type="button"
                      className="voice-button"
                      onClick={() => void sendChatMessage(heardText)}
                      disabled={chatLoading || !heardText.trim()}
                    >
                      Use this
                    </button>
                  </div>
                </div>
              ) : null}
              <p className="chat-help">
                Try: “Wheat bread with turkey, cheddar, lettuce, and mayo.” To correct it, say “remove the turkey” or “change to chicken.”
                {!voiceSupported ? " Voice input is unavailable in this browser; text input works normally." : ""}
              </p>
              <p className="privacy-note">
                Privacy: this screen sends only order details needed for your sub, such as ingredients, name, and pickup time. Avoid adding payment or contact information here.
              </p>
              <p className="platform-note">Prototype target: responsive desktop and mobile browsers with text fallback.</p>
            </div>

            <div>
              <div className="order-summary">
                <div>
                  <div className="summary-meta">Your {proteinSummary.toLowerCase()}</div>
                  <div className="summary-main">
                    <div className="qty-box" aria-label="Quantity selector">
                      <button type="button" className="operator" onClick={() => setQuantity((value) => Math.max(1, value - 1))} disabled={quantity === 1}>−</button>
                      <span>{quantity}</span>
                      <button type="button" className="operator" onClick={() => setQuantity((value) => value + 1)}>+</button>
                    </div>
                    <div className="price">
                      ${displayTotal.toFixed(2)}
                      <small>total</small>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="cta-button"
                  onClick={addCurrentOrderToBag}
                >
                  Add to bag
                </button>
              </div>
              <div className="confirmation">{confirmationText}</div>
              {orderError ? <p className="order-error" role="alert">{orderError}</p> : null}
              {checkoutMessage ? <p className="checkout-message" role="status">{checkoutMessage}</p> : null}
              {cartItems.length > 0 ? (
                <div className="cart-panel">
                  <div className="cart-heading">
                    <strong>Your bag ({cartCount})</strong>
                    <button type="button" className="undo-button" onClick={() => setCartOpen((open) => !open)}>
                      {cartOpen ? "Hide review" : "Review bag"}
                    </button>
                  </div>
                  {cartOpen ? (
                    <>
                      <ul className="cart-list">
                        {cartItems.map((item) => (
                          <li key={item.id} className="cart-item">
                            <div>
                              <strong>{item.quantity} × {item.size} sub</strong>
                              <p>{item.summary}</p>
                            </div>
                            <div>
                              <button type="button" className="undo-button" onClick={() => editCartItem(item)}>Edit</button>
                              <button type="button" className="cart-remove" onClick={() => removeCartItem(item.id)}>
                                Remove
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                      <div className="checkout-grid">
                        <input
                          className="checkout-input"
                          aria-label="Pickup name"
                          value={pickupName}
                          onChange={(event) => setPickupName(event.target.value)}
                          placeholder="Pickup name"
                        />
                        <input
                          className="checkout-input"
                          aria-label="Pickup time"
                          value={pickupTime}
                          onChange={(event) => setPickupTime(event.target.value)}
                          placeholder="Pickup time"
                        />
                      </div>
                      <div className="cart-total-row">
                        <span>Total ${cartTotal.toFixed(2)}</span>
                        <button type="button" className="checkout-button" onClick={completeCheckout}>
                          Confirm pickup
                        </button>
                      </div>
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default OrderSection