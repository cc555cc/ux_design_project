import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react"
import { useAuth } from "../hook/useAuth"
import {
  CART_STORAGE_KEY,
  DRAFT_STORAGE_KEY,
  saveCompletedOrder,
} from "../data/orderHistory"
import assemblecounter from "../assets/scene-deli-counter.png"
import woodenPlate from "../assets/board-oak-v2.png"
import breadTopLayer from "../assets/sandwich_layer/layer-bread-top.png"
import breadBottomLayer from "../assets/sandwich_layer/layer-bread-bottom.png"
import cheeseLayer from "../assets/sandwich_layer/layer-cheese.png"
import cucumberLayer from "../assets/sandwich_layer/layer-cucumber.png"
import lettuceLayer from "../assets/sandwich_layer/layer-lettuce.png"
import olivesLayer from "../assets/sandwich_layer/layer-olives.png"
import onionLayer from "../assets/sandwich_layer/layer-onion.png"
import peppersLayer from "../assets/sandwich_layer/layer-peppers.png"
import tomatoLayer from "../assets/sandwich_layer/layer-tomato.png"
import turkeyLayer from "../assets/sandwich_layer/layer-turkey.png"
import chickenLayer from "../assets/sandwich_layer/chicken.png"
import roastBeefLayer from "../assets/sandwich_layer/roast-beef.png"
import swissLayer from "../assets/sandwich_layer/swiss-cheese.png"
import provoloneLayer from "../assets/sandwich_layer/provolone-cheese.png"
import italianHerbsLayer from "../assets/sandwich_layer/italian-herbs-bread.png"
import wheatLayer from "../assets/sandwich_layer/wheat-bread.png"
import honeyOatLayer from "../assets/sandwich_layer/honey-oat-bread.png"
import mayoBowl from "../assets/sandwich_layer/mayo-side-view.png"
import chipotleBowl from "../assets/sandwich_layer/chipotle-side-view.png"
import ranchBowl from "../assets/sandwich_layer/ranch-side-view.png"
import cheesePiece from "../assets/ingredients/piece-cheese.png"
import cucumberPiece from "../assets/ingredients/piece-cucumber.png"
import lettucePiece from "../assets/ingredients/piece-lettuce.png"
import olivesPiece from "../assets/ingredients/piece-olives.png"
import onionPiece from "../assets/ingredients/piece-onion.png"
import peppersPiece from "../assets/ingredients/piece-peppers.png"
import tomatoPiece from "../assets/ingredients/piece-tomato.png"
import turkeyPiece from "../assets/ingredients/piece-turkey.png"
import italianHerbsIcon from "../assets/ingredients/italian-herbs-bread.png"
import wheatIcon from "../assets/ingredients/wheat-bread.png"
import honeyOatIcon from "../assets/ingredients/honey-oat-bread.png"
import roastBeefIcon from "../assets/ingredients/icon-roast-beef.png"
import chickenIcon from "../assets/ingredients/icon-chicken.png"
import swissIcon from "../assets/ingredients/icon-swiss-cheese.png"
import provoloneIcon from "../assets/ingredients/icon-provolone-cheese.png"
import mayoPiece from "../assets/ingredients/mayo-sauce.png"
import chipotlePiece from "../assets/ingredients/chipotle-sauce.png"
import ranchPiece from "../assets/ingredients/ranch-sauce.png"
import staffHelper from "../assets/sandwich-shop-employee-male_transparent.png"

const productOptions = ["Bread", "Protein", "Cheese", "Veggies", "Sauce"] as const
type ProductOption = (typeof productOptions)[number]

type ToppingOption = {
  name: string
  color: string
  category: ProductOption
  image: string
  /** transparent cut-out shown as the picker icon (falls back to `image`) */
  icon?: string
  /** set when `icon` is a photo on a light background instead of a cut-out: the background is blended into the
      card, and this is how much the photo is enlarged so the food fills the card like the cut-outs do */
  photoZoom?: number
  /** transparent side-view layer for the sandwich preview; its measurements go in `layerBoxes` (falls back to a labelled pill) */
  layer?: string
  /** transparent picture shown on the counter beside the sandwich instead of in the stack (sauces) */
  side?: string
}

const toppingOptions: ToppingOption[] = [
  { name: "Italian Herbs", color: "#dcbf86", category: "Bread", image: "/toppings/italian-herbs.jpg", icon: italianHerbsIcon, photoZoom: 1.15, layer: italianHerbsLayer },
  { name: "Wheat", color: "#c28f4d", category: "Bread", image: "/toppings/wheat.jpg", icon: wheatIcon, photoZoom: 1.15, layer: wheatLayer },
  { name: "Honey Oat", color: "#debb76", category: "Bread", image: "/toppings/honey-oat.jpg", icon: honeyOatIcon, photoZoom: 1.15, layer: honeyOatLayer },
  { name: "Turkey", color: "#cc9d6d", category: "Protein", image: "/toppings/turkey.jpg", icon: turkeyPiece, layer: turkeyLayer },
  { name: "Roast Beef", color: "#8c4f3d", category: "Protein", image: "/toppings/roast-beef.jpg", icon: roastBeefIcon, photoZoom: 1.5, layer: roastBeefLayer },
  { name: "Chicken", color: "#d4a772", category: "Protein", image: "/toppings/chicken.jpg", icon: chickenIcon, photoZoom: 1.5, layer: chickenLayer },
  { name: "Cheddar", color: "#e7b839", category: "Cheese", image: "/toppings/cheddar.jpg", icon: cheesePiece, layer: cheeseLayer },
  { name: "Swiss", color: "#f1da78", category: "Cheese", image: "/toppings/swiss.jpg", icon: swissIcon, photoZoom: 1.5, layer: swissLayer },
  { name: "Provolone", color: "#f2dd9c", category: "Cheese", image: "/toppings/provolone.jpg", icon: provoloneIcon, photoZoom: 1.4, layer: provoloneLayer },
  { name: "Lettuce", color: "#7bbf68", category: "Veggies", image: "/toppings/lettuce.jpg", icon: lettucePiece, layer: lettuceLayer },
  { name: "Tomato", color: "#d7482d", category: "Veggies", image: "/toppings/tomato.jpg", icon: tomatoPiece, layer: tomatoLayer },
  { name: "Cucumber", color: "#8dcf64", category: "Veggies", image: "/toppings/cucumber.jpg", icon: cucumberPiece, layer: cucumberLayer },
  { name: "Red onion", color: "#d26471", category: "Veggies", image: "/toppings/red-onion.jpg", icon: onionPiece, layer: onionLayer },
  { name: "Green peppers", color: "#356a38", category: "Veggies", image: "/toppings/green-peppers.jpg", icon: peppersPiece, layer: peppersLayer },
  { name: "Black olives", color: "#393939", category: "Veggies", image: "/toppings/black-olives.jpg", icon: olivesPiece, layer: olivesLayer },
  { name: "Mayo", color: "#f5e8bf", category: "Sauce", image: "/toppings/mayo.jpg", icon: mayoPiece, side: mayoBowl },
  { name: "Chipotle", color: "#b5573f", category: "Sauce", image: "/toppings/chipotle.jpg", icon: chipotlePiece, side: chipotleBowl },
  { name: "Ranch", color: "#e7e1cf", category: "Sauce", image: "/toppings/ranch.jpg", icon: ranchPiece, side: ranchBowl },
]

const basePrice = 9.5
const extraIngredientPrice = 0.45
const maxIngredientPortions = 8
/** above this many distinct fillings, the preview shows one layer per category */
const maxPreviewLayers = 5
/** each extra portion of the same ingredient makes its layer this much taller (capped at 3 portions) */
const portionStretch = 0.35

type PreviewLayer = { option: ToppingOption; amount: number }

/** how much of each filling peeks out below the layer above it (0–1 of its visible height) */
const layerReveal = 0.3
/** a layer PNG's size, the top/bottom edge of its visible food (image px), and its drawn width (% of .sandwich-build) */
type LayerBox = { width: number; height: number; top: number; bottom: number; drawn: number }
const paddedBox = (top: number, bottom: number): LayerBox => ({ width: 1536, height: 512, top, bottom, drawn: 88 })
/** PNGs trimmed right to the food: no padding, so they're drawn a little narrower to match the padded ones */
const trimmedBox = (height: number, drawn: number): LayerBox => ({ width: 1200, height, top: 0, bottom: height, drawn })
const layerBoxes = new Map<string, LayerBox>([
  [turkeyLayer, paddedBox(160, 356)],
  [cheeseLayer, paddedBox(152, 340)],
  [lettuceLayer, paddedBox(152, 348)],
  [tomatoLayer, paddedBox(152, 364)],
  [cucumberLayer, paddedBox(172, 332)],
  [onionLayer, paddedBox(148, 320)],
  [peppersLayer, paddedBox(172, 336)],
  [olivesLayer, paddedBox(176, 332)],
  [chickenLayer, trimmedBox(154, 86)],
  [roastBeefLayer, trimmedBox(160, 86)],
  [swissLayer, trimmedBox(165, 86)],
  [provoloneLayer, trimmedBox(140, 86)],
  [breadBottomLayer, paddedBox(104, 411)],
  [italianHerbsLayer, trimmedBox(255, 85)],
  [wheatLayer, trimmedBox(249, 85)],
  [honeyOatLayer, trimmedBox(249, 85)],
])
/** where the first filling's bottom edge lands on each bottom bread: just above the crumb/crust line (image px) */
const breadLanding = new Map<string, number>([
  [breadBottomLayer, 288],
  [italianHerbsLayer, 136],
  [wheatLayer, 147],
  [honeyOatLayer, 131],
])

/** size + negative margins that tuck a layer against its neighbours: the layer above lands `landing` px down this image */
const layerStyle = (layer: string, landing: (box: LayerBox) => number, stretch = 1): CSSProperties => {
  const box = layerBoxes.get(layer) ?? paddedBox(160, 345)
  const toPct = (px: number) => (px * box.drawn * stretch) / box.width
  return {
    width: `${box.drawn}%`,
    // a fixed ratio overrides the PNG's own, so repeat portions stretch the image vertically
    aspectRatio: `${box.width} / ${Math.round(box.height * stretch)}`,
    marginTop: `${-toPct(landing(box))}%`,
    marginBottom: `${-toPct(box.height - box.bottom)}%`,
  }
}
const fillingStyle = (layer: string, stretch: number) =>
  layerStyle(layer, (box) => box.top + (1 - layerReveal) * (box.bottom - box.top), stretch)
const bottomBreadStyle = (layer: string) => layerStyle(layer, (box) => breadLanding.get(layer) ?? box.top)

const layerStretch = (amount: number) => 1 + portionStretch * (Math.min(Math.max(amount, 1), 3) - 1)
type ToppingAmounts = Record<string, number>

/** pickup is limited to opening hours (9 AM – 9 PM), in 15-minute steps, at least 15 minutes from now */
const pickupOpens = 9 * 60
const pickupCloses = 21 * 60
const pickupStep = 15

const formatPickup = (minutes: number) => {
  const hour = Math.floor(minutes / 60)
  return `${hour % 12 || 12}:${String(minutes % 60).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`
}

/** "12:30", "1pm", "noon" → minutes since midnight; without AM/PM, 1–8 means the afternoon since the shop opens at 9 */
const parsePickup = (text: string): number | null => {
  const value = text.trim().toLowerCase()
  if (value === "noon") return 12 * 60
  const match = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/.exec(value)
  if (!match) return null
  let hour = Number(match[1])
  const minute = Number(match[2] ?? 0)
  if (minute > 59 || hour > 23 || (match[3] && (hour < 1 || hour > 12))) return null
  if (match[3]) hour = (hour % 12) + (match[3] === "pm" ? 12 : 0)
  else if (hour >= 1 && hour < 9) hour += 12
  return hour * 60 + minute
}

/** turns whatever the chatbot (or an old draft) stored into the picker's own wording */
const toPickupValue = (text: string) => {
  if (text.trim().toLowerCase() === "asap") return "ASAP"
  const minutes = parsePickup(text)
  return minutes === null ? text : formatPickup(minutes)
}

const getPickupChoices = (now: Date) => {
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const earliest = nowMinutes + pickupStep
  const today = earliest <= pickupCloses
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    .toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
  const slots: string[] = []
  for (let minutes = pickupOpens; minutes <= pickupCloses; minutes += pickupStep) {
    // once it's too late for today, offer tomorrow's times (dated, so order history stays correct)
    if (!today) slots.push(`${tomorrow}, ${formatPickup(minutes)}`)
    else if (minutes >= earliest) slots.push(formatPickup(minutes))
  }
  if (today && nowMinutes >= pickupOpens) slots.unshift("ASAP")
  const isAllowed = (value: string) => {
    if (slots.includes(value)) return true
    // an in-between time agreed in chat, such as 12:40
    const minutes = parsePickup(value)
    return today && minutes !== null && minutes >= Math.max(earliest, pickupOpens) && minutes <= pickupCloses
  }
  return { slots, isAllowed }
}

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
  order_id?: string | null
  account_id?: string | null
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
  account_id?: string
  summary: string
  size: string
  quantity: number
  total: number
  toppingAmounts: ToppingAmounts
}

const draftStorageKey = DRAFT_STORAGE_KEY

const chatOfflineMessage = "The chat assistant isn't available right now. You can still build your sub here."

/** an unreachable server answers with an empty page instead of JSON */
const readChatResponse = async (response: Response) => {
  try {
    return (await response.json()) as ChatbotResponse
  } catch {
    throw new Error(chatOfflineMessage)
  }
}
const cartStorageKey = CART_STORAGE_KEY

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
  const user = useAuth((state) => state.user)
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
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    // keeps the pickup times current while the page stays open
    const timer = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(timer)
  }, [])
  const pickupChoices = getPickupChoices(now)
  const selectedPickup = pickupChoices.isAllowed(pickupTime) ? pickupTime : ""
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)
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

  // One layer per ingredient (extra portions stretch it taller instead of stacking copies).
  // Past maxPreviewLayers distinct ingredients, collapse to one layer per category so the stack stays short.
  const previewLayers = useMemo<PreviewLayer[]>(() => {
    // sauces are not stacked: they stand in bowls beside the board (see previewSauces)
    const categoryOrder: ProductOption[] = ["Cheese", "Protein", "Veggies"]
    const perIngredient = categoryOrder.flatMap((category) =>
      selectedOptions
        .filter((option) => option.category === category)
        .map((option) => ({ option, amount: toppingAmounts[option.name] ?? 0 }))
    )
    if (perIngredient.length <= maxPreviewLayers) return perIngredient

    return categoryOrder.flatMap((category) => {
      const inCategory = perIngredient.filter((entry) => entry.option.category === category)
      if (inCategory.length === 0) return []
      // represent the category with an ingredient that has a real layer image, then the one with most portions
      const representative = inCategory.reduce((best, entry) => {
        const entryHasLayer = Boolean(entry.option.layer)
        const bestHasLayer = Boolean(best.option.layer)
        if (entryHasLayer !== bestHasLayer) return entryHasLayer ? entry : best
        return entry.amount > best.amount ? entry : best
      })
      const categoryAmount = inCategory.reduce((total, entry) => total + entry.amount, 0)
      return [{ option: representative.option, amount: categoryAmount }]
    })
  }, [selectedOptions, toppingAmounts])

  // the bottom bread shown in the preview: the chosen bread (the one with most portions if several are picked)
  const previewBread = selectedOptions
    .filter((option) => option.category === "Bread")
    .reduce<ToppingOption | null>(
      (best, option) => (best && toppingAmounts[best.name] >= toppingAmounts[option.name] ? best : option),
      null
    )
  const previewBreadLayer = previewBread ? previewBread.layer ?? breadBottomLayer : null

  const previewSauces = selectedOptions.filter((option) => option.side)
  const previewPortionCount = [...previewLayers, ...previewSauces.map((option) => ({ amount: toppingAmounts[option.name] ?? 0 }))]
    .reduce((total, entry) => total + entry.amount, 0)


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
  // Only the latest exchange is shown: the staff's newest line plus the customer's newest line (if any),
  // in the order they happened. While a reply is loading, the staff bubble is the "working on it" line.
  const visibleExchange = useMemo<ChatMessage[]>(() => {
    const roles = chatMessages.map((message) => message.role)
    const userIndex = roles.lastIndexOf("user")
    const staffIndex = roles.lastIndexOf("assistant")
    const staff: ChatMessage = { role: "assistant", text: chatLoading ? "I’m working on that..." : lastAssistantMessage }
    if (userIndex < 0) return [staff]
    const user = chatMessages[userIndex]
    return chatLoading || staffIndex > userIndex ? [user, staff] : [staff, user]
  }, [chatMessages, chatLoading, lastAssistantMessage])
  const chatLogRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const log = chatLogRef.current
    if (log) log.scrollTop = log.scrollHeight
  }, [visibleExchange])
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
      if (response.order.pickup_time) setPickupTime(toPickupValue(response.order.pickup_time))

      if (response.status === "complete" && response.order_id) {
        const summary = mappedSelections.length > 0 ? mappedSelections.join(", ") : "Custom sub"
        const total = typeof response.total === "number" ? response.total : basePrice
        saveCompletedOrder({
          id: response.order_id,
          ...(user ? { account_id: user.id } : {}),
          pickupName: response.order.name ?? pickupName,
          pickupTime: response.order.pickup_time ?? pickupTime,
          total,
          createdAt: new Date().toISOString(),
          source: "chat",
          items: [
            {
              id: `item-${response.order_id}`,
              ...(user ? { account_id: user.id } : {}),
              summary,
              size: response.order.size ?? sandwichSize,
              quantity: 1,
              total,
              toppingAmounts: nextAmounts,
            },
          ],
        })
      }
    }

    if (response.step && stepToCategoryMap[response.step]) {
      setActiveCategory(stepToCategoryMap[response.step])
    }
  }

  async function resetChatSession() {
    clearPreview()
    setChatMessages([])
    setChatLoading(true)
    setChatError(null)
    try {
      const payload: Record<string, string> = {}
      if (chatSessionId) payload.session_id = chatSessionId
      if (user) payload.account_id = user.id

      const response = await fetch("/api/chat/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await readChatResponse(response)
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
        body: JSON.stringify({
          message,
          session_id: chatSessionId ?? undefined,
          ...(user ? { account_id: user.id } : {}),
        }),
      })

      const data = await readChatResponse(response)
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
      ...(user ? { account_id: user.id } : {}),
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
    if (!getPickupChoices(new Date()).isAllowed(pickupTime)) {
      setNow(new Date())
      setCheckoutMessage("Choose a pickup time between 9 AM and 9 PM, at least 15 minutes from now.")
      return
    }

    const trimmedName = pickupName.trim()
    saveCompletedOrder({
      id: `order-${Date.now()}`,
      ...(user ? { account_id: user.id } : {}),
      pickupName: trimmedName,
      pickupTime,
      items: cartItems.map((item) => ({
        ...item,
        ...(user ? { account_id: user.id } : {}),
        toppingAmounts: { ...item.toppingAmounts },
      })),
      total: cartTotal,
      createdAt: new Date().toISOString(),
      source: "manual",
    })

    const confirmation = `Order confirmed for ${trimmedName}. Pickup: ${pickupTime}.`
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
      try {
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
          setPickupTime(toPickupValue(draft.pickupTime ?? ""))

          if (draft.chatSessionId) {
            try {
              const response = await fetch(`/api/session?session_id=${encodeURIComponent(draft.chatSessionId)}`)
              const state = await readChatResponse(response)
              if (!response.ok) throw new Error(chatOfflineMessage)
              if (state.status === "idle") {
                // the server no longer knows this conversation, so its old lines would only mislead
                setChatMessages([])
                setChatSessionId(state.session_id)
                setChatError("The assistant session expired. Your local draft was preserved, so you can continue.")
              } else {
                applyChatState(state)
              }
            } catch {
              // server unreachable: keep the sandwich, drop the old conversation
              setChatMessages([])
              setChatError(chatOfflineMessage)
            }
          }
        } catch {
          localStorage.removeItem(draftStorageKey)
          await resetChatSession()
        }
      } finally {
        setIsHydrated(true)
      }
    }

    void restore()
  }, [])

  useEffect(() => {
    if (!isHydrated) return
    const draft = {
      ...(user ? { account_id: user.id } : {}),
      toppingAmounts,
      sandwichSize,
      quantity,
      chatMessages,
      chatSessionId,
      pickupName,
      pickupTime,
    }
    localStorage.setItem(draftStorageKey, JSON.stringify(draft))
  }, [isHydrated, user, toppingAmounts, sandwichSize, quantity, chatMessages, chatSessionId, pickupName, pickupTime])

  useEffect(() => {
    if (!isHydrated) return
    localStorage.setItem(cartStorageKey, JSON.stringify(cartItems))
  }, [isHydrated, cartItems])

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
        /* the dark photo sits behind the logo only; on this page the nav links are over the light background */
        body:has(.order-section) nav a.text-white { color: #111; }
        body:has(.order-section) nav a.text-white:hover { color: var(--color-red-600, #dc2626); }

        .order-section {
          /* light slate palette — every colour on the page comes from these */
          --bg: #e4e8e5;
          --surface: rgba(255, 255, 255, 0.25);
          --surface-raised: rgba(255, 255, 255, 0.6);
          --surface-hover: rgba(255, 255, 255, 0.9);
          --field: #ffffff;
          --text: #1f2321;
          --text-muted: #545b57;
          --text-faint: #7c837f;
          --line: rgba(31, 35, 33, 0.12);
          --line-strong: rgba(31, 35, 33, 0.22);
          --accent: #d62a2a;
          --accent-hover: #e63b3b;
          --danger: #b3261e;
          --shadow: rgba(31, 35, 33, 0.12);
          /* locked to the viewport: the page itself never scrolls (long lists scroll inside their own box) */
          height: 100vh;
          height: 100dvh;
          overflow: hidden;
          /* light chalk texture: fine dark grain (SVG noise tile) + brighter wiped patches + one eraser streak */
          background-color: var(--bg);
          background-image:
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.07 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"),
            radial-gradient(ellipse 55% 35% at 18% 22%, rgba(255, 255, 255, 0.55), transparent 70%),
            radial-gradient(ellipse 45% 30% at 82% 68%, rgba(255, 255, 255, 0.45), transparent 70%),
            radial-gradient(ellipse 35% 25% at 55% 95%, rgba(255, 255, 255, 0.35), transparent 70%),
            linear-gradient(100deg, transparent 32%, rgba(255, 255, 255, 0.3) 46%, transparent 60%);
          background-size: 220px 220px, auto, auto, auto, auto;
          font-family: Inter, "Segoe UI", sans-serif;
          color: var(--text);
          padding: 0 18px;
        }

        .order-shell { width: 100%; height: 100%; margin: 0 auto; border-radius: 18px; }

        /* no frame: the panels sit straight on the chalk background */
        .order-card { height: 100%; display: flex; flex-direction: column; }
        .layout { flex: 1; min-height: 0; display: grid; grid-template-columns: 1.38fr 1fr; gap: 18px; }
        /* container-type lets .image-stage size itself from this column's width (cqw units) */
        .product-panel { background: transparent; padding: 0; display: flex; flex-direction: column; min-height: 0; overflow: hidden; container-type: inline-size; }
        .panel-label { display: flex; align-items: center; justify-content: space-between; color: var(--text-muted); text-transform: uppercase; font-size: 0.72rem; letter-spacing: 0.12em; margin-bottom: 6px; }
        .panel-label .mini-pill { border: 1px solid var(--line); border-radius: 999px; padding: 4px 7px; background: var(--surface-raised); }
        .start-over-button { border: 1px solid var(--line-strong); border-radius: 999px; padding: 5px 10px; background: rgba(20, 17, 16, 0.6); color: #fff; font-size: 0.66rem; font-weight: 700; text-transform: none; letter-spacing: normal; cursor: pointer; }
        .start-over-button:hover:not(:disabled) { background: rgba(20, 17, 16, 0.8); }
        .start-over-button:disabled { opacity: 0.5; cursor: not-allowed; }
        .product-panel h1 { margin: 4px 0 0; font-size: clamp(1.8rem, 3vw, 2.6rem); line-height: 1.05; letter-spacing: -0.06em; font-weight: 700; color: var(--text); }
        /* The photo (1536×1024) is drawn at the column's full width and shifted up 8.724cqw, which always
           hides its top ~13% (the pendant lamps). The stage's height then decides how much of the
           countertop at the bottom is shown: 52cqw ends just under the board.
           On short screens it gives up height first (flex-shrink 20 vs the chat's 1). */
        .image-stage { flex: 0 20 52cqw; min-height: 220px; margin: 6px 0 0; border-radius: 18px 18px 0 0; background-color: #3a2f28; background-size: 100% auto; background-position: center -8.724cqw; position: relative; overflow: hidden; box-shadow: inset 0 0 0 1px rgba(0,0,0,0.2); padding: 16px 16px 34px; display: flex; flex-direction: column; justify-content: flex-end; }
        /* sits in the 34px strip under the board instead of taking its own row */
        .image-stage > .preview-meta { position: absolute; left: 50%; bottom: 8px; transform: translateX(-50%); margin: 0; z-index: 1; white-space: nowrap; }
        /* navbar logo box spans 8px → (10vh - 8px) from the viewport top; the stage starts 6px down */
        .stage-heading { position: absolute; inset: 0; z-index: 2; pointer-events: none; }
        .stage-heading > * { pointer-events: auto; }
        .stage-heading .panel-label { position: absolute; top: calc(5vh - 6px); right: 18px; transform: translateY(-50%); margin: 0; gap: 10px; justify-content: flex-end; color: #fff; text-shadow: 0 1px 6px rgba(30, 20, 12, 0.7); }
        /* logo img is (10vh - 24px) tall at a 560:470 ratio inside a box starting 24px from the viewport edge;
           its right edge lands ~11.92vh from the stage's left edge, so the heading starts 16px past that */
        .product-panel .stage-heading h1 { position: absolute; top: calc(5vh - 6px); left: calc(11.92vh + 16px); transform: translateY(-50%); margin: 0; white-space: nowrap; color: #fff; text-shadow: 0 2px 10px rgba(30, 20, 12, 0.55); }
        /* The stack is built bottom-up (column-reverse) so each higher layer paints over the one below.
           Layers overlap via negative margins, worked out from each PNG's measured food edges
           (percentages resolve against .sandwich-build's width):
             margin-top    = -(where the next layer should land, measured from this image's top)
             margin-bottom = -(transparent space under this image's visible content)            */
        .sandwich-build { width: min(460px, 62%); margin: 0 auto; display: flex; flex-direction: column-reverse; align-items: center; }
        /* margin-bottom tucks away the transparent strip under the board (117 of the PNG's 512px = 7.62% of its width) */
        .sandwich-build > .plate { transform: scaleX(1.1); width: 100%; height: auto; margin-top: -15%; margin-bottom: -7.62%; pointer-events: none; filter: drop-shadow(0 10px 12px rgba(40, 26, 17, 0.25)); }
        /* the stretch of counter right of the board. --free is its width: half of what the board
           (1.1 × the .sandwich-build width) leaves over. It starts at the counter's back edge, 34.6cqw down the photo */
        .sauce-bowls { --free: calc((100cqw - 1.1 * min(460px, 62cqw - 20px)) / 2); position: absolute; right: 0; top: 34.6cqw; bottom: 0; width: var(--free); pointer-events: none; }
        .sauce-bowls img { position: absolute; width: min(calc(var(--free) * 0.56), 125px); height: auto; filter: drop-shadow(0 6px 5px rgba(40, 26, 17, 0.35)); }
        /* zig-zag from back to front, so no bowl hides another's sauce */
        .sauce-bowls img:nth-child(1) { left: 4%; bottom: 58%; }
        .sauce-bowls img:nth-child(2) { left: 40%; bottom: 33%; }
        .sauce-bowls img:nth-child(3) { left: 4%; bottom: 6%; }
        .sauce-bowls img:only-child { left: 20%; bottom: 33%; }
        /* everything on the board. --stretch-x lengthens both sizes; the oversized insets leave room for overlaps and shadows */
        .sandwich-stack { --stretch-x: 1.12; width: 100%; display: flex; flex-direction: column-reverse; align-items: center; clip-path: inset(-100% -20% -100% -20%); transform: translateX(0) scaleX(var(--stretch-x)); transition: clip-path 0.3s ease, transform 0.3s ease; }
        /* 6-inch = a footlong cut in half: hide the right half, then slide the rest back to the board's centre
           (the sandwich spans ~7–93% of the board, so its left half is centred at 28.5%: 50 - 28.5 = 21.5) */
        .sandwich-stack.six-inch { clip-path: inset(-100% 50% -100% -20%); transform: translateX(calc(21.5% * var(--stretch-x))) scaleX(var(--stretch-x)); }
        /* on a wrapper, so the shadows are drawn after the cut: #cut-shade darkens the cut end, drop-shadow falls beside it */
        .sandwich-cut { width: 100%; }
        .sandwich-cut.six-inch { filter: url(#cut-shade) drop-shadow(8px 4px 7px rgba(30, 18, 10, 0.5)); }
        .layer { display: block; width: 88%; height: auto; pointer-events: none; filter: drop-shadow(0 3px 4px rgba(40, 26, 17, 0.28)); }
        /* fillings and the bottom bread get their width + margins inline (see layerStyle) because each PNG has different padding */
        .layer-bread-top { margin-bottom: -6%; }
        .ingredient-layer {
          width: 82%;
          margin-top: calc(-17px * var(--stretch, 1));
          height: calc(24px * var(--stretch, 1));
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
        .preview-meta {
          margin: 8px auto 0;
          padding: 3px 10px;
          width: fit-content;
          border-radius: 999px;
          background: rgba(20, 17, 16, 0.72);
          text-align: center;
          font-size: 0.72rem;
          color: #fff;
        }

        .builder-panel { background: transparent; padding: calc(10vh + 20px) 18px 16px; display: flex; flex-direction: column; min-height: 0; overflow: hidden; }
        .builder-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .builder-title { margin: 0; font-size: clamp(1.5rem, 2vw, 2.3rem); line-height: 1.1; letter-spacing: -0.05em; font-weight: 700; color: var(--text); }
        .builder-tabs { display: flex; gap: 10px; list-style: none; margin: 0 0 10px; padding: 0; flex-wrap: wrap; }
        .tab-button { border: 1px solid var(--line); border-radius: 999px; color: var(--text-muted); background: var(--surface-raised); font-size: 0.75rem; font-weight: 600; padding: 8px 14px; cursor: pointer; transition: all 0.2s ease; }
        .tab-button:hover { color: var(--text); background: var(--surface-hover); }
        .tab-button.active { background: var(--text); color: var(--bg); border-color: var(--text); }

        /* takes whatever height is left in the column and scrolls inside itself; the 4px padding keeps the
           selected cards' outline from being clipped at the scroll edges */
        .topping-grid { flex: 1 1 auto; min-height: 0; overflow-y: auto; scrollbar-width: thin; align-content: start; display: grid; grid-auto-rows: max-content; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin: 0 -4px; padding: 4px; }
        .topping-item { overflow: hidden; background: var(--surface-raised); border: 1px solid var(--line); border-radius: 14px; padding: 14px 10px 12px; text-align: center; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 10px; min-height: 180px; }
        .topping-item.selected { border-color: var(--accent); box-shadow: 0 0 0 2px rgba(224, 54, 47, 0.25); }
        .topping-swatch { flex: none; width: clamp(84px, 55%, 120px); aspect-ratio: 1; border-radius: 14px; border: 1px solid var(--line); overflow: hidden; background: var(--field); }
        .topping-swatch img { width: 100%; height: 100%; object-fit: cover; display: block; }
        /* transparent cut-outs: no box, wider frame to match the 992×672 PNGs */
        .topping-swatch.cutout { position: relative; min-height: 0; width: min(86%, 176px); aspect-ratio: 992 / 672; border: 0; border-radius: 0; background: transparent; overflow: visible; }
        .topping-swatch.cutout img { position: absolute; inset: 0; pointer-events: none; object-fit: contain; transform: scale(1.15); filter: drop-shadow(0 4px 6px rgba(31, 35, 33, 0.22)); }
        /* the sauce bowls are trimmed to their edge (no padding), so they need no enlarging */
        .topping-swatch.cutout.bowl img { transform: none; }
        /* photos on a light background: brightness turns the grey into white, and multiply makes white disappear.
           No drop-shadow here, it would outline the photo's rectangle (the photos have their own shadow) */
        .topping-swatch.cutout.photo img { mix-blend-mode: multiply; filter: brightness(1.08); transform: scale(var(--photo-zoom)); }
        .topping-item .name { font-size: 0.82rem; color: var(--text-muted); font-weight: 600; }
        .topping-item.selected .name { color: var(--text); }
        .topping-stepper { display: flex; align-items: center; gap: 4px; padding: 3px; border: 1px solid var(--line); border-radius: 999px; background: var(--field); }
        .topping-stepper button { width: 28px; height: 28px; border: 0; border-radius: 50%; background: transparent; color: var(--text); font-size: 1rem; line-height: 1; cursor: pointer; }
        .topping-stepper button:hover:not(:disabled) { background: var(--surface-hover); }
        .topping-stepper button:disabled { color: var(--text-faint); opacity: 0.5; cursor: not-allowed; }
        .topping-stepper .amount { min-width: 18px; text-align: center; font-size: 0.84rem; font-weight: 700; color: var(--text); }

        .builder-summary { margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--line); display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: 0.7rem; color: var(--text-muted); }
        .builder-summary-left { display: flex; align-items: center; gap: 8px; min-width: 0; }
        .undo-button { border: 1px solid var(--line-strong); border-radius: 999px; background: var(--surface-raised); padding: 4px 8px; color: var(--text); font-size: 0.68rem; font-weight: 700; cursor: pointer; }
        .undo-button:hover:not(:disabled) { background: var(--surface-hover); }
        .undo-button:disabled { opacity: 0.45; cursor: not-allowed; }
        .summary-pill { display: inline-flex; align-items: center; gap: 7px; padding: 4px 8px; border: 1px solid var(--line); border-radius: 999px; background: var(--surface-raised); }
        .summary-pill strong { color: var(--text); }
        .size-picker { display: flex; gap: 6px; margin-top: 8px; }
        .size-button { border: 1px solid var(--line-strong); border-radius: 999px; background: var(--surface-raised); color: var(--text-muted); padding: 5px 10px; font-size: 0.66rem; font-weight: 700; cursor: pointer; }
        .size-button.active { color: var(--bg); background: var(--text); border-color: var(--text); }

        .order-column { flex: none; margin-top: 12px; }
        /* sits under the counter photo; fills leftover height on tall screens, scrolls inside itself if squeezed */
        /* sits under the counter photo: the conversation on the left, the staff member on the right.
           Fills leftover height on tall screens; if squeezed, only the conversation side scrolls. */
        /* same width as the counter photo and runs flush to the bottom edge of the screen (square bottom corners) */
        .chat-panel { flex: 1 1 auto; min-height: 0; margin: 12px 0 0; background: var(--surface-raised); border: 1px solid var(--line); border-bottom: none; border-radius: 16px 16px 0 0; overflow: hidden; display: grid; grid-template-columns: minmax(0, 1fr) clamp(130px, 28%, 210px); grid-template-rows: minmax(0, 1fr); }
        .chat-display { min-width: 0; min-height: 0; overflow-x: hidden; overflow-y: auto; scrollbar-width: thin; padding: 12px 4px 12px 12px; display: flex; flex-direction: column; gap: 8px; }
        /* margin-top: auto pushes the controls, and everything after them (heard card, help, privacy), to the bottom */
        .chat-controls { margin-top: auto; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
        .chat-controls .chat-form { flex: 1 1 260px; }
        .chat-kicker { margin: 0; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted); }
        /* the bubble hugs the staff side; its square bottom-right corner points at them */
        /* fills the free space between the heading and the controls; transparent so only the bubbles show */
        /* vertical scrolling only: overflow-x is hidden so nothing can cause a sideways scrollbar */
        .chat-log { flex: 1 1 0; min-height: 70px; overflow-x: hidden; overflow-y: auto; scrollbar-width: thin; background: transparent; display: flex; flex-direction: column; gap: 12px; padding: 4px 0 6px; }
        .speech { flex: none; align-self: flex-end; margin-right: 0; position: relative; background: var(--field); border: 2px solid var(--text); border-radius: 18px 18px 0 18px; padding: 10px 16px 8px; max-width: min(440px, 100%); overflow-wrap: anywhere; box-shadow: 0 8px 18px var(--shadow); }
        .speech p { margin: 0; font-size: 0.9rem; line-height: 1.4; color: var(--text); }
        /* the customer's bubble: dark, on the left, square bottom-left corner */
        .speech.from-user { align-self: flex-start; margin: 0; background: var(--text); border-color: var(--text); border-radius: 18px 18px 18px 0; }
        .speech.from-user p { color: var(--bg); }
        .speech .tiny { font-size: 0.7rem; opacity: 0.85; margin-top: 8px; color: var(--text-muted); }
        /* the cut-out (446×669) ends at the waist, so it's pinned to the panel's bottom edge like someone
           standing behind the counter; "contain" keeps the whole figure visible at any panel height */
        .chat-staff { position: relative; min-height: 200px; background: radial-gradient(ellipse 85% 55% at 50% 100%, rgba(214, 42, 42, 0.12), transparent 72%); }
        .chat-staff img { position: absolute; inset: 0; width: 100%; height: 100%; padding-top: 10px; object-fit: contain; object-position: center bottom; transform-origin: 50% 100%; filter: drop-shadow(0 6px 10px rgba(31, 35, 33, 0.18)); pointer-events: none; }
        .chat-staff.processing img { animation: staffBob 1.4s ease-in-out infinite; }
        @keyframes staffBob { 50% { transform: translateY(-4px) rotate(-1deg); } }
        .avatar-status { position: absolute; left: 50%; bottom: 10px; transform: translateX(-50%); max-width: calc(100% - 16px); width: max-content; padding: 4px 10px; border-radius: 999px; background: rgba(255, 255, 255, 0.92); box-shadow: 0 2px 8px var(--shadow); font-size: 0.62rem; font-weight: 700; line-height: 1.3; color: var(--text); text-align: center; }
        .chat-staff.error .avatar-status { color: var(--danger); box-shadow: 0 0 0 2px rgba(179, 38, 30, 0.25); }
        .chat-error { font-size: 0.72rem; color: var(--danger); }
        .retry-button { border: 0; background: transparent; color: var(--danger); font-weight: 700; text-decoration: underline; cursor: pointer; padding: 0 0 0 4px; }
        .chat-form { display: flex; gap: 8px; }
        .chat-input { flex: 1; border: 1px solid var(--line-strong); border-radius: 999px; padding: 8px 12px; font-size: 0.75rem; background: var(--field); color: var(--text); }
        .chat-input::placeholder, .checkout-input::placeholder { color: var(--text-faint); }
        .chat-send { border: 0; border-radius: 999px; background: var(--text); color: var(--bg); font-size: 0.7rem; font-weight: 700; padding: 8px 12px; cursor: pointer; }
        .chat-send:disabled { opacity: 0.4; cursor: not-allowed; }
        .voice-controls { display: flex; align-items: center; gap: 6px; }
        .voice-button { border: 1px solid var(--line-strong); border-radius: 999px; background: var(--field); color: var(--text); padding: 7px 10px; font-size: 0.68rem; font-weight: 700; cursor: pointer; }
        .voice-button:hover:not(:disabled) { background: var(--surface-hover); }
        .voice-button:disabled { opacity: 0.48; cursor: not-allowed; }
        .heard-card { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 9px 10px; border: 1px solid var(--line); border-radius: 12px; background: var(--field); font-size: 0.7rem; color: var(--text-muted); }
        .heard-card strong { display: block; margin-bottom: 2px; color: var(--text); }
        .heard-actions { display: flex; gap: 5px; }
        .platform-note { margin: 0; font-size: 0.62rem; font-weight: 700; color: var(--text-faint); text-transform: uppercase; letter-spacing: 0.06em; }
        .chat-help { margin: 4px 0 0; font-size: 0.66rem; line-height: 1.35; color: var(--text-muted); }
        .privacy-note { margin: 0; font-size: 0.62rem; line-height: 1.4; color: var(--text-faint); }

        .order-summary { background: var(--surface-raised); border: 1px solid var(--line); border-radius: 16px; padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
        .summary-meta { color: var(--text-muted); font-size: 0.72rem; letter-spacing: 0.08em; text-transform: uppercase; }
        .summary-main { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-top: 10px; }
        .summary-main .price { font-size: 2.1rem; letter-spacing: -0.06em; font-weight: 800; color: var(--text); }
        .summary-main .price small { font-size: 0.8rem; color: var(--text-muted); font-weight: 600; letter-spacing: 0.03em; margin-left: 6px; }
        .qty-box { display: flex; align-items: center; gap: 8px; background: var(--field); border: 1px solid var(--line); border-radius: 999px; padding: 6px 8px; font-weight: 700; color: var(--text); }
        .operator { width: 28px; height: 28px; border-radius: 50%; border: 0; display: grid; place-items: center; background: var(--surface-hover); color: var(--text); cursor: pointer; font-size: 1rem; line-height: 1; }
        .operator:disabled { cursor: not-allowed; opacity: 0.45; }
        .cta-button { border: none; border-radius: 999px; background: var(--accent); color: #fff; font-weight: 700; padding: 12px 22px; box-shadow: 0 12px 18px rgba(224, 54, 47, 0.25); cursor: pointer; transition: background 0.2s ease; }
        .cta-button:hover { background: var(--accent-hover); }
        .confirmation { margin-top: 7px; font-size: 0.72rem; color: var(--text-muted); max-width: 220px; }
        .order-error { margin: 7px 0 0; font-size: 0.72rem; color: var(--danger); max-width: 260px; }
        .cart-panel { margin-top: 10px; padding: 12px; border: 1px solid var(--line); border-radius: 14px; background: var(--surface-raised); }
        .cart-heading { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 0.78rem; }
        .cart-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 7px; max-height: 18vh; overflow-y: auto; scrollbar-width: thin; }
        .cart-item { display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: start; padding: 8px; border-radius: 10px; background: var(--field); font-size: 0.7rem; }
        .cart-item p { margin: 2px 0 0; color: var(--text-muted); }
        .cart-remove { border: 0; background: transparent; color: var(--danger); font-size: 0.68rem; cursor: pointer; }
        .checkout-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px; }
        .checkout-input { border: 1px solid var(--line-strong); border-radius: 999px; padding: 8px 10px; background: var(--field); color: var(--text); font-size: 0.72rem; }
        .cart-total-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-top: 10px; font-size: 0.76rem; font-weight: 700; }
        .checkout-button { border: 0; border-radius: 999px; background: var(--accent); color: #fff; padding: 8px 12px; font-size: 0.7rem; font-weight: 700; cursor: pointer; }
        .checkout-button:hover { background: var(--accent-hover); }
        .checkout-message { margin: 8px 0 0; font-size: 0.7rem; color: var(--text-muted); }
        button:focus-visible, input:focus-visible { outline: 3px solid rgba(240, 74, 66, 0.6); outline-offset: 2px; }

        /* single column on narrow screens: too much to fit in one screen, so the page scrolls normally again */
        @media (max-width: 980px) {
          .order-section { height: auto; min-height: 100vh; overflow: visible; padding-bottom: 18px; }
          .chat-panel { border-bottom: 1px solid var(--line); border-radius: 16px; }
          .order-shell, .order-card { height: auto; }
          .layout { grid-template-columns: 1fr; }
          .product-panel { overflow: visible; }
          .image-stage { flex: none; aspect-ratio: 1536 / 800; min-height: 0; }
          .chat-display { overflow-y: visible; }
          .chat-log { flex: none; overflow-y: visible; }
          .builder-panel { padding-top: 20px; overflow: visible; }
          .topping-grid { overflow: visible; }
        }

        @media (max-width: 700px) {
          .product-panel .stage-heading h1 { top: calc(10vh + 2px); left: 18px; transform: none; }
          .builder-tabs { justify-content: center; }
          .topping-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .summary-main { flex-direction: column; align-items: flex-start; }
          .chat-panel { grid-template-columns: minmax(0, 1fr) 110px; }
          .checkout-grid { grid-template-columns: 1fr; }
        }

        @media (prefers-reduced-motion: reduce) {
          .chat-staff.processing img { animation: none; }
          .sandwich-stack { transition: none; }
        }
`}</style>

      <div className="order-shell">
        <div className="order-card">
          <div className="layout">
            <div className="product-panel">
              <div
                className="image-stage"
                aria-label="Live sandwich preview"
                data-nav-theme="dark"
                style={{ backgroundImage: `url(${assemblecounter})` }}
              >
                <div className="stage-heading">
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
                </div>
                {/* column-reverse: first child sits at the bottom, so this list reads plate → bread → fillings → bread */}
                <div className="sandwich-build" aria-hidden="true">
                  {/* inner shadow along right-facing edges: whatever lies within ~20px of the cut gets darker */}
                  <svg width="0" height="0" style={{ position: "absolute" }}>
                    <filter id="cut-shade" x="-50%" y="-150%" width="200%" height="400%" colorInterpolationFilters="sRGB">
                      <feOffset in="SourceAlpha" dx="-16" dy="0" result="moved" />
                      <feGaussianBlur in="moved" stdDeviation="9 0" result="soft" />
                      <feFlood floodColor="#2a1608" floodOpacity="0.8" />
                      <feComposite in2="soft" operator="out" result="edge" />
                      <feComposite in="edge" in2="SourceAlpha" operator="in" result="shade" />
                      <feMerge>
                        <feMergeNode in="SourceGraphic" />
                        <feMergeNode in="shade" />
                      </feMerge>
                    </filter>
                  </svg>
                  <img className="plate" src={woodenPlate} alt="" />
                  <div className={`sandwich-cut${sandwichSize === "6-inch" ? " six-inch" : ""}`}>
                  <div className={`sandwich-stack${sandwichSize === "6-inch" ? " six-inch" : ""}`}>
                    {previewBreadLayer ? <img className="layer" src={previewBreadLayer} alt="" style={bottomBreadStyle(previewBreadLayer)} /> : null}
                    {/* previewLayers is ordered top-down, so reverse it to stack bottom-up */}
                    {[...previewLayers].reverse().map(({ option, amount }) => {
                      const stretch = layerStretch(amount)
                      return option.layer ? (
                        <img
                          key={`preview-${option.name}`}
                          className="layer"
                          src={option.layer}
                          alt=""
                          style={fillingStyle(option.layer, stretch)}
                        />
                      ) : (
                        <div
                          key={`preview-${option.name}`}
                          className="ingredient-layer"
                          style={{
                            "--stretch": stretch,
                            backgroundImage: `linear-gradient(rgba(35, 28, 23, 0.16), rgba(35, 28, 23, 0.16)), url(${option.image})`,
                          } as CSSProperties}
                        >
                          <span>{option.name}</span>
                        </div>
                      )
                    })}
                    {hasBread ? <img className="layer layer-bread-top" src={breadTopLayer} alt="" /> : null}
                  </div>
                  </div>
                </div>
                <div className="sauce-bowls" aria-hidden="true">
                  {previewSauces.map((option) => (
                    <img key={option.name} src={option.side} alt="" />
                  ))}
                </div>
                <div className="preview-meta">
                  {previewPortionCount === 0 && !hasBread
                    ? "Select toppings to build your sandwich"
                    : `${previewPortionCount} ingredient portion${previewPortionCount === 1 ? "" : "s"} selected`}
                </div>
              </div>
              <div className="chat-panel" aria-label="Order chatbot">
                {/* left: the conversation · right: the staff member you're talking to */}
                <div className="chat-display">
                  <p className="chat-kicker">A little help from the counter.</p>
                  {/* see-through, scrollable conversation box: customer bubbles on the left, staff bubbles on the right */}
                  <div className="chat-log" ref={chatLogRef} role="log" aria-live="polite">
                    {visibleExchange.map((message, index) =>
                      message.role === "user" ? (
                        <div key={`user-${index}`} className="speech from-user">
                          <p>{message.text}</p>
                        </div>
                      ) : (
                        <div key={`staff-${index}`} className="speech">
                          <p>{message.text}</p>
                          <div className="tiny">{selectedNames.length > 0 ? selectedNames.join(", ") : "Pick ingredients to start."}</div>
                        </div>
                      )
                    )}
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

                  {/* sits right above the message box so it is never pushed out of view */}
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
                  <div className="chat-controls">
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
                  </div>
                  <p className="chat-help">
                    Try: “Wheat bread with turkey, cheddar, lettuce, and mayo.” To correct it, say “remove the turkey” or “change to chicken.”
                    {!voiceSupported ? " Voice input is unavailable in this browser; text input works normally." : ""}
                  </p>
                  <p className="privacy-note">
                    Privacy: this screen sends only order details needed for your sub, such as ingredients, name, and pickup time. Avoid adding payment or contact information here.
                  </p>
                </div>
                <div
                  className={`chat-staff${chatLoading || isListening || isSpeaking ? " processing" : chatError ? " error" : ""}`}
                >
                  <img src={staffHelper} alt="Long Story Sub staff member helping with your order" />
                  <span className="avatar-status" role="status">{assistantStatus}</span>
                </div>
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
                      <div className={`topping-swatch${topping.icon ? " cutout" : ""}${topping.category === "Sauce" ? " bowl" : ""}${topping.photoZoom ? " photo" : ""}`} style={{ "--photo-zoom": topping.photoZoom } as CSSProperties} aria-hidden="true">
                        <img src={topping.icon ?? topping.image} alt="" loading="lazy" />
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
              <div className="order-column">
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
                          <select
                            className="checkout-input"
                            aria-label="Pickup time"
                            value={selectedPickup}
                            onChange={(event) => setPickupTime(event.target.value)}
                          >
                            <option value="" disabled>Pickup time</option>
                            {selectedPickup && !pickupChoices.slots.includes(selectedPickup) ? (
                              <option value={selectedPickup}>{selectedPickup}</option>
                            ) : null}
                            {pickupChoices.slots.map((slot) => (
                              <option key={slot} value={slot}>{slot}</option>
                            ))}
                          </select>
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
      </div>
    </section>
  )
}

export default OrderSection