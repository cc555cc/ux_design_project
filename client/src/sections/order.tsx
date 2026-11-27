import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react"
import { useAuth } from "../hook/useAuth"
import {
  CART_STORAGE_KEY,
  DRAFT_STORAGE_KEY,
  saveCompletedOrder,
  loadLocalOrderHistory,
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
import italianHerbsTopLayer from "../assets/sandwich_layer/layer-bread-italian-herbs-top.png"
import wheatTopLayer from "../assets/sandwich_layer/layer-bread-wheat-top.png"
import honeyOatTopLayer from "../assets/sandwich_layer/layer-bread-honey-oat-top.png"
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
import arrowLeft from "../assets/arrow-left-circle.svg"
import arrowRight from "../assets/arrow-right-circle.svg"

const productOptions = ["Bread", "Protein", "Cheese", "Veggies", "Sauce"] as const
type ProductOption = (typeof productOptions)[number]
type OrderMode = "menu" | "voice"
/** delivery is the main way the shop sells; pickup is for customers who come to the shop */
type Fulfillment = "delivery" | "pickup"
const fulfillmentOptions: { id: Fulfillment; label: string }[] = [
  { id: "delivery", label: "Delivery" },
  { id: "pickup", label: "Pickup" },
]

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
  /** breads only: the matching top half drawn over the fillings (falls back to the generic top bread) */
  topLayer?: string
  /** transparent picture shown on the counter beside the sandwich instead of in the stack (sauces) */
  side?: string
}

const toppingOptions: ToppingOption[] = [
  { name: "Italian Herbs", color: "#dcbf86", category: "Bread", image: "/toppings/italian-herbs.jpg", icon: italianHerbsIcon, photoZoom: 1.15, layer: italianHerbsLayer, topLayer: italianHerbsTopLayer },
  { name: "Wheat", color: "#c28f4d", category: "Bread", image: "/toppings/wheat.jpg", icon: wheatIcon, photoZoom: 1.15, layer: wheatLayer, topLayer: wheatTopLayer },
  { name: "Honey Oat", color: "#debb76", category: "Bread", image: "/toppings/honey-oat.jpg", icon: honeyOatIcon, photoZoom: 1.15, layer: honeyOatLayer, topLayer: honeyOatTopLayer },
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

/* Pricing, matched to the chat assistant's menu (server MENU_ITEMS) so both ordering modes charge the same.
   The size sets the base price; veggies, sauces and the first cheese are free; only "too much" costs extra. */
const sizePrices: Record<string, number> = { "6-inch": 6.99, Footlong: 10.99 }
/** premium breads and proteins */
const ingredientSurcharges: Record<string, number> = { "Italian Herbs": 0.5, "Honey Oat": 0.5, "Roast Beef": 1, Chicken: 0.75 }
/** a Large portion, or each protein / cheese after the first */
const extraMeatPrice = 1.5
const extraCheesePrice = 0.75
const pricingNote = `Veggies & sauces are free. Extra meat +$${extraMeatPrice.toFixed(2)}, extra cheese +$${extraCheesePrice.toFixed(2)}.`

/** price of one sub */
function priceSub(amounts: ToppingAmounts, size: string): number {
  let total = sizePrices[size] ?? sizePrices["6-inch"]
  let proteins = 0
  let cheeses = 0
  for (const option of toppingOptions) {
    const amount = amounts[option.name] ?? 0
    if (amount === 0) continue
    total += ingredientSurcharges[option.name] ?? 0
    if (option.category === "Protein") {
      if (proteins > 0) total += extraMeatPrice
      if (amount >= 3) total += extraMeatPrice
      proteins += 1
    } else if (option.category === "Cheese") {
      if (cheeses > 0) total += extraCheesePrice
      if (amount >= 3) total += extraCheesePrice
      cheeses += 1
    }
  }
  return Math.round(total * 100) / 100
}
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
/** the per-bread top halves: 2172×724, bread spans almost the full width, so drawn at 85% like the bottom breads */
const topBreadBox = (top: number, bottom: number): LayerBox => ({ width: 2172, height: 724, top, bottom, drawn: 85 })
const layerBoxes = new Map<string, LayerBox>([
  [breadTopLayer, paddedBox(90, 405)],
  [italianHerbsTopLayer, topBreadBox(120, 587)],
  [wheatTopLayer, topBreadBox(123, 586)],
  [honeyOatTopLayer, topBreadBox(116, 591)],
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
/** nothing lands on the top bread; its bottom margin trims the transparent strip so it sits on the fillings */
const topBreadStyle = (layer: string) => layerStyle(layer, () => 0)

/** scene-deli-counter.png is 1536×1024; the wooden counter's back edge is at y = 665 */
const counterScene = { width: 1536, height: 1024, backEdge: 665 }
/** board-oak-v2.png is 1536 wide; the visible board runs from y = 100 (its back edge) to y = 398 (its front edge) */
const boardImage = { width: 1536, top: 100, bottom: 398 }
/** how far up the counter the board's back edge sits: 1 = right at the counter's back edge */
const boardDepth = 0.94

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

/** what the success screen and the confirmation email need, kept after the bag is emptied */
type PlacedOrder = {
  id: string
  name: string
  email: string
  fulfillment: Fulfillment
  time: string
  address: string
  total: number
  subCount: number
}

const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

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
  /** a second meat / cheese ("turkey and beef") */
  extra_protein?: string | null
  extra_cheese?: string | null
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
  results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }>
}

/** what each speech-recognition error code means for the customer (codes from the Web Speech API) */
const voiceErrorMessages: Record<string, string> = {
  "not-allowed": "Microphone access was blocked. Allow it from the icon in the address bar, or type your order.",
  "service-not-allowed": "This browser won't let the page use its speech service. Try Chrome or Edge, or type your order.",
  "audio-capture": "No microphone was found. Check that one is connected, or type your order.",
  network: "The browser's speech service couldn't be reached (some browsers, like Brave, block it). Try Chrome or Edge, or type your order.",
  "no-speech": "I didn't hear anything. Tap Start voice order and speak right away.",
  "language-not-supported": "Voice input isn't available in English in this browser. Please type your order.",
}
const voiceErrorFallback = "Voice input stopped unexpectedly. Please try again or type your order."
/** remembers the "Voice replies" switch in this browser */
const voiceRepliesStorageKey = "long-story-voice-replies"
const speechOutputSupported = "speechSynthesis" in window
/** listening ended with no words and no error: the browser has the feature but its speech service gave nothing back */
const voiceNoResultMessage =
  "I didn't catch any words. Check that the right microphone is selected and not muted (the icon in the address bar), or try Chrome or Edge. You can also type your order."

type RecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onstart: (() => void) | null
  onaudiostart?: (() => void) | null
  onspeechstart?: (() => void) | null
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
  const singleValueFields = [order.bread, order.protein, order.extra_protein, order.cheese, order.extra_cheese]

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

function titleForCategory(category: ProductOption | "Suggestion"): string {
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
    case "Suggestion":
      return "Start from a favourite."
    default:
      return "Build your sub."
  }
}

const breadSizes = ["6-inch", "Footlong"] as const
const toppingPortionLevels = [
  { label: "Small", amount: 1 },
  { label: "Normal", amount: 2 },
  { label: "Large", amount: 3 },
] as const
const breadOptionNames = new Set(
  toppingOptions.filter((option) => option.category === "Bread").map((option) => option.name)
)
/** sauces don't count toward maxIngredientPortions */
const sauceOptionNames = new Set(
  toppingOptions.filter((option) => option.category === "Sauce").map((option) => option.name)
)
type BuilderSnapshot = {
  toppingAmounts: ToppingAmounts
  sandwichSize: string
}

// One layer per ingredient (extra portions stretch it taller instead of stacking copies), ordered top-down.
// Past maxPreviewLayers distinct ingredients, collapse to one layer per category so the stack stays short.
function buildPreviewLayers(amounts: ToppingAmounts): PreviewLayer[] {
  // sauces are not stacked: they stand in bowls beside the sandwich
  const categoryOrder: ProductOption[] = ["Cheese", "Protein", "Veggies"]
  const perIngredient = categoryOrder.flatMap((category) =>
    toppingOptions
      .filter((option) => option.category === category && (amounts[option.name] ?? 0) > 0)
      .map((option) => ({ option, amount: amounts[option.name] ?? 0 }))
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
}

/** the builder's tabs: the five ingredient categories, then ready-made combinations */
type BuilderTab = ProductOption | "Suggestion"
const builderTabs: BuilderTab[] = [...productOptions, "Suggestion"]

type SubSuggestion = {
  name: string
  /** portions per ingredient, same scale as the builder: bread 1, Small 1, Normal 2, Large 3 (8 at most in total) */
  amounts: ToppingAmounts
}

const subSuggestions: SubSuggestion[] = [
  { name: "Classic Turkey", amounts: { Wheat: 1, Turkey: 2, Cheddar: 1, Lettuce: 1, Tomato: 1, Mayo: 1 } },
  { name: "Chipotle Chicken", amounts: { "Italian Herbs": 1, Chicken: 2, Provolone: 1, "Green peppers": 1, "Red onion": 1, Chipotle: 1 } },
  { name: "Roast Beef & Swiss", amounts: { "Honey Oat": 1, "Roast Beef": 2, Swiss: 2, "Red onion": 1, Mayo: 1 } },
  { name: "Chicken Ranch", amounts: { "Honey Oat": 1, Chicken: 2, Cheddar: 1, Lettuce: 1, Tomato: 1, Ranch: 1 } },
  { name: "Garden Veggie", amounts: { "Italian Herbs": 1, Provolone: 1, Lettuce: 1, Tomato: 1, Cucumber: 1, "Green peppers": 1, "Black olives": 1, Ranch: 1 } },
  { name: "Smoky Beef", amounts: { Wheat: 1, "Roast Beef": 2, Provolone: 1, "Green peppers": 1, "Black olives": 1, Chipotle: 1 } },
]

const suggestionIngredients = (suggestion: SubSuggestion) =>
  toppingOptions
    .filter((option) => (suggestion.amounts[option.name] ?? 0) > 0)
    .map((option) => option.name)
    .join(" · ")

/** a side view of a sub built from the same layer images (and positioning) as the big preview; it fills its parent's width */
function SandwichStack({ amounts, className = "" }: { amounts: ToppingAmounts; className?: string }) {
  const bread = toppingOptions.find((option) => option.category === "Bread" && (amounts[option.name] ?? 0) > 0)
  const bottomLayer = bread?.layer ?? breadBottomLayer
  const topLayer = bread?.topLayer ?? breadTopLayer

  return (
    // column-reverse: first child sits at the bottom, so this reads bottom bread → fillings → top bread
    <div className={`sandwich-side-stack ${className}`}>
      <img className="layer" src={bottomLayer} alt="" style={bottomBreadStyle(bottomLayer)} />
      {[...buildPreviewLayers(amounts)].reverse().map(({ option, amount }) =>
        option.layer ? (
          <img
            key={option.name}
            className="layer"
            src={option.layer}
            alt=""
            style={fillingStyle(option.layer, layerStretch(amount))}
          />
        ) : null
      )}
      <img className="layer" src={topLayer} alt="" style={topBreadStyle(topLayer)} />
    </div>
  )
}

/* Loading screen. The order page's pictures are large, so on a slow connection it would appear in pieces.
   Until what's visible first has loaded, a sub is drawn across the screen as the progress bar. */
/** the sub drawn as the progress bar: mostly the smaller layer files, so the bar itself appears quickly */
const loaderAmounts: ToppingAmounts = { "Italian Herbs": 1, Chicken: 1, "Roast Beef": 1, Swiss: 1, Lettuce: 1 }
/** what is on screen as soon as the page opens (the loader's own layers first); the rest keeps loading in the background */
const firstScreenImages = [
  italianHerbsLayer,
  italianHerbsTopLayer,
  chickenLayer,
  roastBeefLayer,
  swissLayer,
  lettuceLayer,
  assemblecounter,
  woodenPlate,
  ...toppingOptions.filter((option) => option.category === "Bread").map((option) => option.icon ?? option.image),
]
/** set once the first-screen pictures have loaded, so coming back to the order page skips the loader */
let firstScreenLoaded = false
/** show the page anyway after this long, even if some pictures never arrive */
const loaderTimeoutMs = 15_000
/** for demos the loader always takes at least this long, so the loading screen can be seen even on a fast connection.
    "?slowload=8000" changes it for one visit; "?slowload=0" turns it off (real loading time only) */
const defaultDemoLoadMs = 5000
const demoLoadMs = (() => {
  const value = new URLSearchParams(window.location.search).get("slowload")
  if (value === null || value === "") return defaultDemoLoadMs
  return Number(value) >= 0 ? Number(value) : defaultDemoLoadMs
})()

/** another sub of the order, peeking in from the edge of the counter (null = the empty board for a new sub) */
function NeighborSub({ item, side }: { item: CartItem | null; side: "left" | "right" }) {
  const cut = item?.size === "Footlong" ? "" : " six-inch"
  return (
    <div className={`sandwich-build neighbor-sub ${side}`} aria-hidden="true">
      <img className="plate" src={woodenPlate} alt="" />
      {item ? (
        <div className={`sandwich-cut${cut}`}>
          <div className={`sandwich-stack${cut}`}>
            <SandwichStack amounts={item.toppingAmounts} />
          </div>
        </div>
      ) : null}
    </div>
  )
}

/** a suggestion card's picture: the sub, plus its sauce bowls in the corner */
function SandwichThumb({ amounts }: { amounts: ToppingAmounts }) {
  const sauces = toppingOptions.filter((option) => option.side && (amounts[option.name] ?? 0) > 0)

  return (
    <div className="suggestion-thumb" aria-hidden="true">
      <SandwichStack amounts={amounts} />
      {sauces.length > 0 ? (
        <div className="suggestion-sauces">
          {sauces.map((option) => (
            <img key={option.name} src={option.side} alt="" />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function OrderSection() {
  const [orderMode, setOrderMode] = useState<OrderMode>("menu")
  const [activeCategory, setActiveCategory] = useState<BuilderTab>("Bread")
  const user = useAuth((state) => state.user)
  const [toppingAmounts, setToppingAmounts] = useState<ToppingAmounts>(() => ({ ...emptyToppingAmounts }))
  const [sandwichSize, setSandwichSize] = useState("6-inch")
  const [quantity, setQuantity] = useState(1)
  /** the bag sub being edited on the counter, or null while building a new sub (which sits after the bag's subs) */
  const [editingId, setEditingId] = useState<string | null>(null)
  /** right after "Add to bag" the sub stays on the counter; the next ingredient or suggestion starts a new sub */
  const [addedOnCounter, setAddedOnCounter] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState("")
  const [chatSessionId, setChatSessionId] = useState<string | null>(null)
  const [chatLoading, setChatLoading] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)
  const [chatTotal, setChatTotal] = useState<number | null>(null)
  const [orderError, setOrderError] = useState<string | null>(null)
  const [undoSnapshot, setUndoSnapshot] = useState<BuilderSnapshot | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [voiceReplies, setVoiceReplies] = useState(() => {
    try {
      return localStorage.getItem(voiceRepliesStorageKey) === "on"
    } catch {
      return false
    }
  })
  const voiceRepliesRef = useRef(voiceReplies)
  const [heardText, setHeardText] = useState("")
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null)
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [pickupName, setPickupName] = useState("")
  const [pickupTime, setPickupTime] = useState("")
  const [fulfillment, setFulfillment] = useState<Fulfillment>("delivery")
  const [deliveryAddress, setDeliveryAddress] = useState("")
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    // keeps the pickup times current while the page stays open
    const timer = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(timer)
  }, [])
  const pickupChoices = getPickupChoices(now)
  const selectedPickup = pickupChoices.isAllowed(pickupTime) ? pickupTime : ""
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null)
  const [customerEmail, setCustomerEmail] = useState("")
  /** the checkout popup: the form, then (once placed) the success screen */
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [placedOrder, setPlacedOrder] = useState<PlacedOrder | null>(null)
  /** "needed": a chat order with no email address yet, so the success screen asks for one */
  const [emailStatus, setEmailStatus] = useState<"needed" | "sending" | "sent" | "failed">("sending")
  const [emailFieldError, setEmailFieldError] = useState<string | null>(null)
  /** the placed order's subs, for sending the email later from the success screen */
  const placedItemsRef = useRef<CartItem[]>([])
  const checkoutNameRef = useRef<HTMLInputElement>(null)
  const checkoutDoneRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    // move focus into the popup: the first field on the form, the Done button on the success screen
    if (!checkoutOpen) return
    if (placedOrder) checkoutDoneRef.current?.focus()
    else checkoutNameRef.current?.focus()
  }, [checkoutOpen, placedOrder])
  const [isHydrated, setIsHydrated] = useState(false)
  const initRef = useRef(false)
  const recognitionRef = useRef<RecognitionLike | null>(null)
  /** set when the user presses "Stop listening", so ending with no words isn't reported as a problem */
  const manualStopRef = useRef(false)
  const stageRef = useRef<HTMLDivElement>(null)
  const [boardLift, setBoardLift] = useState<number | null>(null)
  const [limitNoticeVisible, setLimitNoticeVisible] = useState(false)
  const limitNoticeTimerRef = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(limitNoticeTimerRef.current), [])
  const [imagesLoaded, setImagesLoaded] = useState(() => (firstScreenLoaded ? firstScreenImages.length : 0))
  // the demo delay plays once per page load; coming back to the order page during the visit is instant
  const [demoProgress, setDemoProgress] = useState(demoLoadMs > 0 && !firstScreenLoaded ? 0 : 1)
  const [loaderTimedOut, setLoaderTimedOut] = useState(false)
  const loadProgress = Math.min(imagesLoaded / firstScreenImages.length, demoProgress)
  const pageLoading = loadProgress < 1 && !loaderTimedOut

  useEffect(() => {
    // count the first-screen pictures as they arrive (a failed one counts too, so the bar never gets stuck)
    if (firstScreenLoaded) return
    let cancelled = false
    let done = 0
    for (const src of firstScreenImages) {
      const image = new Image()
      image.onload = image.onerror = () => {
        if (cancelled) return
        done += 1
        if (done === firstScreenImages.length) firstScreenLoaded = true
        setImagesLoaded(done)
      }
      image.src = src
    }
    const timeout = window.setTimeout(() => setLoaderTimedOut(true), loaderTimeoutMs)
    return () => {
      cancelled = true
      window.clearTimeout(timeout)
    }
  }, [])

  useEffect(() => {
    if (demoLoadMs === 0 || firstScreenLoaded) return
    const start = performance.now()
    const timer = window.setInterval(() => {
      const progress = Math.min(1, (performance.now() - start) / demoLoadMs)
      setDemoProgress(progress)
      if (progress >= 1) window.clearInterval(timer)
    }, 50)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    // Moves the board back to the far edge of the counter. The counter photo covers the stage and is pinned to its
    // bottom, so where that edge lands depends on the stage's size: measure it, and again whenever it resizes.
    const stage = stageRef.current
    if (!stage) return
    const place = () => {
      const width = stage.clientWidth
      const height = stage.clientHeight
      const photoHeight = Math.max(height, (width * counterScene.height) / counterScene.width)
      const edgeFromBottom = (photoHeight * (counterScene.height - counterScene.backEdge)) / counterScene.height
      // .sandwich-build is min(460px, 62%) of the stage's content box (16px padding each side)
      const boardWidth = Math.min(460, 0.62 * (width - 32))
      const boardHeight = (boardWidth * (boardImage.bottom - boardImage.top)) / boardImage.width
      setBoardLift(Math.max(26, Math.round(edgeFromBottom * boardDepth - boardHeight)))
    }
    place()
    const observer = new ResizeObserver(place)
    observer.observe(stage)
    return () => observer.disconnect()
  }, [])

  const visibleToppings = useMemo(
    () => toppingOptions.filter((option) => option.category === activeCategory),
    [activeCategory]
  )

  const selectedNames = useMemo(
    () =>
      toppingOptions
        .filter((option) => toppingAmounts[option.name] > 0)
        .map((option) => {
          const amount = toppingAmounts[option.name]
          if (option.category !== "Bread") {
            const level = toppingPortionLevels.find((entry) => entry.amount === amount)
            return level ? `${option.name} (${level.label})` : option.name
          }
          return option.name
        }),
    [toppingAmounts]
  )

  const selectedOptions = useMemo(
    () => toppingOptions.filter((option) => toppingAmounts[option.name] > 0),
    [toppingAmounts]
  )

  /** portions that count toward the limit: everything except sauce, which goes on top and takes no room */
  const selectedIngredientCount = useMemo(
    () =>
      Object.entries(toppingAmounts).reduce(
        (total, [name, amount]) => (sauceOptionNames.has(name) ? total : total + amount),
        0
      ),
    [toppingAmounts]
  )
  /** anything at all on the counter, sauce included */
  const hasAnyIngredient = Object.values(toppingAmounts).some((amount) => amount > 0)

  const nonBreadIngredientCount = useMemo(
    () =>
      Object.entries(toppingAmounts).reduce(
        (total, [name, amount]) =>
          breadOptionNames.has(name) || sauceOptionNames.has(name) ? total : total + amount,
        0
      ),
    [toppingAmounts]
  )

  // One layer per ingredient (extra portions stretch it taller instead of stacking copies).
  // Past maxPreviewLayers distinct ingredients, collapse to one layer per category so the stack stays short.
  // sauces are not stacked: they stand in bowls beside the board (see previewSauces)
  const previewLayers = useMemo(() => buildPreviewLayers(toppingAmounts), [toppingAmounts])

  // the bottom bread shown in the preview: the chosen bread (the one with most portions if several are picked)
  const previewBread = selectedOptions
    .filter((option) => option.category === "Bread")
    .reduce<ToppingOption | null>(
      (best, option) => (best && toppingAmounts[best.name] >= toppingAmounts[option.name] ? best : option),
      null
    )
  const previewBreadLayer = previewBread ? previewBread.layer ?? breadBottomLayer : null
  const previewTopLayer = previewBread ? previewBread.topLayer ?? breadTopLayer : null

  const previewSauces = selectedOptions.filter((option) => option.side)
  // the stacked fillings only, so the caption matches the "x / 8 portions" counter (sauce doesn't count)
  const previewPortionCount = previewLayers.reduce((total, entry) => total + entry.amount, 0)


  const totalPrice = useMemo(
    () => priceSub(toppingAmounts, sandwichSize) * quantity,
    [quantity, toppingAmounts, sandwichSize]
  )
  const displayTotal = chatTotal ?? totalPrice

  const proteinSummary = useMemo(
    () => selectedOptions.find((option) => option.category === "Protein")?.name ?? "Custom sub",
    [selectedOptions]
  )
  const conversationMessages = useMemo<ChatMessage[]>(() => {
    const base: ChatMessage[] =
      chatMessages.length > 0
        ? chatMessages
        : [{ role: "assistant", text: "What would you like on your sandwich?" }]
    if (chatLoading) {
      return [...base, { role: "assistant", text: "I’m working on that..." }]
    }
    return base
  }, [chatMessages, chatLoading])
  const lastAssistantIndex = useMemo(() => {
    for (let i = conversationMessages.length - 1; i >= 0; i -= 1) {
      if (conversationMessages[i].role === "assistant") return i
    }
    return -1
  }, [conversationMessages])
  const chatLogRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (orderMode !== "voice") return
    const log = chatLogRef.current
    if (log) log.scrollTop = log.scrollHeight
  }, [conversationMessages, orderMode])
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

  /** the sub on the counter, as a bag entry */
  const liveSubItem = (id: string): CartItem => ({
    id,
    summary: selectedNames.join(", "),
    size: sandwichSize,
    quantity,
    total: displayTotal,
    toppingAmounts: { ...toppingAmounts },
    ...(user ? { account_id: user.id } : {}),
  })
  // The whole order, left to right. A bag sub being edited shows its live state; a new sub comes after all of them.
  const orderSubs = editingId
    ? cartItems.map((item) => (item.id === editingId ? liveSubItem(item.id) : item))
    : cartItems
  const editingIndex = editingId ? cartItems.findIndex((item) => item.id === editingId) : -1
  const currentSlot = editingIndex >= 0 ? editingIndex : cartItems.length
  const subCount = cartItems.length + (editingIndex >= 0 ? 0 : 1)
  const leftNeighbor: CartItem | null = currentSlot > 0 ? orderSubs[currentSlot - 1] : null
  /** while editing a bag sub, the slot to its right is the next bag sub, or the empty board for a new sub */
  const rightNeighbor: CartItem | "new" | null =
    editingIndex >= 0 ? (orderSubs[editingIndex + 1] as CartItem | undefined) ?? "new" : null
  const cartCount = orderSubs.reduce((total, item) => total + item.quantity, 0)
  const cartTotal = orderSubs.reduce((total, item) => total + item.total, 0)
  const confirmationText =
    cartCount === 0 ? "Ready when you are." : `${cartCount} sub${cartCount === 1 ? "" : "s"} in your bag.`
  const speechWindow = window as SpeechWindow
  const SpeechRecognitionConstructor =
    speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition
  const voiceSupported = Boolean(SpeechRecognitionConstructor)

  function clearPreview() {
    setToppingAmounts({ ...emptyToppingAmounts })
    setSandwichSize("6-inch")
    setActiveCategory("Bread")
    setQuantity(1)
    setEditingId(null)
    setAddedOnCounter(false)
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
      // a sub that was just added stays in the bag; the chat is now building the next one
      if (addedOnCounter) leaveAddedSub()
      setToppingAmounts(nextAmounts)
      setUndoSnapshot(null)
      if (response.order.size) setSandwichSize(response.order.size)
      if (response.order.name) setPickupName(response.order.name)
      if (response.order.pickup_time) {
        // the chat assistant only takes pickup orders, so a time agreed in chat is a pickup time
        setPickupTime(toPickupValue(response.order.pickup_time))
        setFulfillment("pickup")
      }

      // reloading the page re-reads a finished chat order: only the first time is a new order
      if (
        response.status === "complete" &&
        response.order_id &&
        !loadLocalOrderHistory().some((saved) => saved.id === response.order_id)
      ) {
        const summary = mappedSelections.length > 0 ? mappedSelections.join(", ") : "Custom sub"
        const total =
          typeof response.total === "number" ? response.total : priceSub(nextAmounts, response.order.size ?? sandwichSize)
        const item: CartItem = {
          id: `item-${response.order_id}`,
          ...(user ? { account_id: user.id } : {}),
          summary,
          size: response.order.size ?? sandwichSize,
          quantity: 1,
          total,
          toppingAmounts: nextAmounts,
        }
        const name = response.order.name ?? pickupName
        const time = toPickupValue(response.order.pickup_time ?? pickupTime)
        saveCompletedOrder({
          id: response.order_id,
          ...(user ? { account_id: user.id } : {}),
          fulfillment: "pickup",
          pickupName: name,
          pickupTime: time,
          total,
          createdAt: new Date().toISOString(),
          source: "chat",
          items: [item],
        })

        // the same checkmark screen as a menu order; it emails right away if we already know the address
        const email = customerEmail.trim()
        const placed: PlacedOrder = {
          id: response.order_id,
          name,
          email,
          fulfillment: "pickup",
          time,
          address: "",
          total,
          subCount: 1,
        }
        placedItemsRef.current = [item]
        setPlacedOrder(placed)
        setCheckoutError(null)
        setEmailFieldError(null)
        setCheckoutOpen(true)
        if (emailPattern.test(email)) {
          setEmailStatus("sending")
          void sendConfirmationEmail(placed, [item])
        } else {
          setEmailStatus("needed")
        }
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
      hasAnyIngredient &&
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
        // a ref, because this can run from the voice input's callback, created before the switch was flipped
        if (voiceRepliesRef.current) speakText(botReply)
      }
    } catch (error) {
      setChatError(error instanceof Error ? error.message : "Unable to send message.")
      setLastFailedMessage(message)
    } finally {
      setChatLoading(false)
    }
  }

  function showLimitNotice() {
    // shown when someone tries to go past the portion limit; hides itself after a few seconds
    setLimitNoticeVisible(true)
    window.clearTimeout(limitNoticeTimerRef.current)
    limitNoticeTimerRef.current = window.setTimeout(() => setLimitNoticeVisible(false), 4000)
  }

  function hideLimitNotice() {
    window.clearTimeout(limitNoticeTimerRef.current)
    setLimitNoticeVisible(false)
  }

  /** the just-added sub moves aside (it's already in the bag) and the counter starts a new, empty sub */
  function leaveAddedSub() {
    const id = editingId
    // keep anything changed since adding (e.g. the quantity) in the bag
    if (id) setCartItems((current) => current.map((item) => (item.id === id ? liveSubItem(id) : item)))
    setEditingId(null)
    setAddedOnCounter(false)
    setSandwichSize("6-inch")
    setQuantity(1)
    setUndoSnapshot(null)
    setChatTotal(null)
    setOrderError(null)
    setCheckoutMessage(null)
  }

  function selectToppingPortion(name: string, targetAmount: number) {
    // picking an ingredient right after "Add to bag" starts the next sub with just that ingredient
    const fresh = addedOnCounter
    const base = fresh ? emptyToppingAmounts : toppingAmounts
    const baseCount = fresh ? 0 : selectedIngredientCount
    const currentAmount = base[name] ?? 0
    const nextAmount = currentAmount === targetAmount ? 0 : targetAmount

    if (!sauceOptionNames.has(name) && baseCount - currentAmount + nextAmount > maxIngredientPortions) {
      showLimitNotice()
      return
    }

    if (fresh) leaveAddedSub()
    else setUndoSnapshot({ toppingAmounts: { ...toppingAmounts }, sandwichSize })
    setToppingAmounts({ ...base, [name]: nextAmount })
    setChatTotal(null)
    setOrderError(null)
  }

  function selectBreadSize(breadName: string, size: string) {
    const fresh = addedOnCounter
    const base = fresh ? emptyToppingAmounts : toppingAmounts
    const baseFillings = fresh ? 0 : nonBreadIngredientCount
    const selectedBreadNames = [...breadOptionNames].filter((name) => (base[name] ?? 0) > 0)
    const isSameSelection =
      !fresh && selectedBreadNames.length === 1 && selectedBreadNames[0] === breadName && sandwichSize === size

    if (!isSameSelection && baseFillings + 1 > maxIngredientPortions) {
      showLimitNotice()
      return
    }

    if (fresh) leaveAddedSub()
    else setUndoSnapshot({ toppingAmounts: { ...toppingAmounts }, sandwichSize })

    const nextAmounts: ToppingAmounts = { ...base }
    for (const name of breadOptionNames) nextAmounts[name] = 0

    if (!isSameSelection) {
      nextAmounts[breadName] = 1
      setSandwichSize(size)
    }

    setToppingAmounts(nextAmounts)
    setChatTotal(null)
    setOrderError(null)
  }

  function applySuggestion(suggestion: SubSuggestion, size: string) {
    // right after "Add to bag" this starts the next sub; otherwise it replaces this one (Undo brings it back)
    if (addedOnCounter) leaveAddedSub()
    else setUndoSnapshot({ toppingAmounts: { ...toppingAmounts }, sandwichSize })
    setToppingAmounts({ ...emptyToppingAmounts, ...suggestion.amounts })
    setSandwichSize(size)
    setChatTotal(null)
    setOrderError(null)
  }

  function undoLastChange() {
    if (!undoSnapshot) return
    setToppingAmounts(undoSnapshot.toppingAmounts)
    setSandwichSize(undoSnapshot.sandwichSize)
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

    const id = editingId ?? crypto.randomUUID()
    if (editingId) {
      setCartItems((current) => current.map((item) => (item.id === id ? liveSubItem(id) : item)))
    } else {
      setCartItems((current) => [...current, liveSubItem(id)])
    }
    // the sub stays on the counter (now as the bag's entry) until the next ingredient or suggestion is picked
    setEditingId(id)
    setAddedOnCounter(true)
    setUndoSnapshot(null)
    setCartOpen(true)
    setOrderError(null)
    if (chatMessages.some((message) => message.role === "user")) void restartChatConversation()
  }

  /** an empty board for the next sub; a chat conversation about the previous sub is restarted too */
  function startNewSub() {
    clearPreview()
    if (chatMessages.some((message) => message.role === "user")) void restartChatConversation()
  }

  /** a fresh chat conversation for the next sub, without touching what's on the counter */
  async function restartChatConversation() {
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
      setChatSessionId(data.session_id)
      setChatMessages(data.reply ? [{ role: "assistant", text: data.reply }] : [])
    } catch (error) {
      setChatError(error instanceof Error ? error.message : "Unable to connect to chatbot server.")
    } finally {
      setChatLoading(false)
    }
  }

  /** before leaving the sub on the counter: an empty new sub can be left behind, anything else must be a complete sub */
  function canLeaveCurrentSub() {
    if (!editingId && !hasAnyIngredient) return true
    if (!hasBread) {
      setOrderError("Choose a bread for this sub before moving to another one.")
      setActiveCategory("Bread")
      return false
    }
    if (!hasFilling) {
      setOrderError("Add at least one ingredient to this sub before moving to another one.")
      return false
    }
    return true
  }

  /** the arrows on the counter (and the bag's Edit button): put this sub away and bring that one to the middle */
  function switchToSub(target: CartItem | "new") {
    if (!canLeaveCurrentSub()) return false
    if (editingId) {
      const id = editingId
      setCartItems(cartItems.map((item) => (item.id === id ? liveSubItem(id) : item)))
    } else if (hasAnyIngredient) {
      // a finished new sub joins the end of the bag instead of being lost
      setCartItems([...cartItems, liveSubItem(crypto.randomUUID())])
    }

    if (target === "new") {
      startNewSub()
    } else {
      setToppingAmounts({ ...emptyToppingAmounts, ...target.toppingAmounts })
      setSandwichSize(target.size)
      setQuantity(target.quantity)
      setEditingId(target.id)
      setAddedOnCounter(false)
      setUndoSnapshot(null)
      setChatTotal(null)
      setOrderError(null)
      setCheckoutMessage(null)
    }
    return true
  }

  function startListening() {
    if (!SpeechRecognitionConstructor || chatLoading) return
    recognitionRef.current?.stop()
    const recognition = new SpeechRecognitionConstructor()
    recognition.lang = "en-US"
    recognition.continuous = false
    // words show up while the user is still talking, so they can see it's working
    recognition.interimResults = true
    // what happened during this one listening session (the console lines help find where voice input stops)
    let lastTranscript = ""
    let sent = false
    let failed = false
    const send = (text: string) => {
      if (sent || !text) return
      sent = true
      void sendChatMessage(text)
    }
    recognition.onstart = () => {
      console.info("[voice] listening started")
      setIsListening(true)
      setChatError(null)
      setHeardText("")
    }
    recognition.onaudiostart = () => console.info("[voice] microphone is sending audio")
    recognition.onspeechstart = () => console.info("[voice] speech detected")
    recognition.onend = () => {
      console.info(`[voice] listening ended (words: ${lastTranscript ? `"${lastTranscript}"` : "none"})`)
      setIsListening(false)
      setHeardText("")
      // some browsers end without marking the words as final: send what was heard anyway
      if (lastTranscript) send(lastTranscript)
      else if (!failed && !manualStopRef.current) setChatError(voiceNoResultMessage)
      manualStopRef.current = false
    }
    recognition.onerror = (event) => {
      failed = true
      setIsListening(false)
      setHeardText("")
      console.warn("[voice] error:", event.error)
      // "aborted" just means listening was stopped on purpose
      if (event.error !== "aborted") setChatError(voiceErrorMessages[event.error] ?? voiceErrorFallback)
    }
    recognition.onresult = (event) => {
      let transcript = ""
      let isFinal = false
      for (let i = 0; i < event.results.length; i += 1) {
        transcript += event.results[i][0].transcript
        if (event.results[i].isFinal) isFinal = true
      }
      transcript = transcript.trim()
      console.info(`[voice] ${isFinal ? "final" : "partial"} result: "${transcript}"`)
      lastTranscript = transcript
      setHeardText(transcript)
      // once the user stops talking, send it like a typed message
      if (isFinal) send(transcript)
    }
    recognitionRef.current = recognition
    try {
      recognition.start()
    } catch (error) {
      console.warn("Speech recognition could not start:", error)
      setChatError(voiceErrorFallback)
    }
  }

  function stopListening() {
    manualStopRef.current = true
    recognitionRef.current?.stop()
    setIsListening(false)
  }

  function switchOrderMode(nextMode: OrderMode) {
    if (nextMode === "menu" && isListening) {
      stopListening()
    }
    // the bag review would cover the panel the user is switching to
    setCartOpen(false)
    setOrderMode(nextMode)
  }

  /** reads a reply out loud, cutting off whatever was being read before */
  function speakText(text: string) {
    if (!speechOutputSupported || !text) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
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
    if (speechOutputSupported) window.speechSynthesis.cancel()
    setIsSpeaking(false)
  }

  /** the "Voice replies" switch: when on, every new reply is read out without clicking anything */
  function toggleVoiceReplies() {
    const next = !voiceReplies
    setVoiceReplies(next)
    voiceRepliesRef.current = next
    try {
      localStorage.setItem(voiceRepliesStorageKey, next ? "on" : "off")
    } catch {
      // storage unavailable (private window): the switch still works for this visit
    }
    if (!next) stopSpeaking()
  }

  function removeCartItem(id: string) {
    setCartItems((current) => current.filter((item) => item.id !== id))
    // removing the sub on the counter leaves an empty board for a new one
    if (id === editingId) startNewSub()
    setCheckoutMessage(null)
  }

  function editCartItem(item: CartItem) {
    if (switchToSub(item)) setCartOpen(false)
  }

  /** "Order": opens the checkout popup with the name, email, time and address fields */
  function openCheckout() {
    if (orderSubs.length === 0) return
    if (editingId && !(hasBread && hasFilling)) {
      setCheckoutMessage("The sub on the counter needs a bread and at least one ingredient before you order.")
      return
    }
    setNow(new Date())
    setCheckoutError(null)
    setPlacedOrder(null)
    setCheckoutMessage(null)
    setCheckoutOpen(true)
  }

  function closeCheckout() {
    setCheckoutOpen(false)
    setPlacedOrder(null)
    setCheckoutError(null)
  }

  async function sendConfirmationEmail(order: PlacedOrder, items: CartItem[]) {
    try {
      const response = await fetch("/api/orders/confirmation-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: order.email,
          name: order.name,
          fulfillment: order.fulfillment,
          address: order.address,
          time: order.time,
          order_id: order.id,
          total: order.total,
          items: items.map(({ quantity, size, summary, total }) => ({ quantity, size, summary, total })),
        }),
      })
      if (response.ok) {
        setEmailStatus("sent")
      } else {
        // the customer sees a short message; the server's reason goes to the console for whoever is debugging
        const reason = await response.json().then((body: { error?: string }) => body.error, () => undefined)
        console.warn(`Confirmation email not sent (HTTP ${response.status}): ${reason ?? "no details"}`)
        setEmailStatus("failed")
      }
    } catch (error) {
      console.warn("Confirmation email not sent: the server could not be reached.", error)
      setEmailStatus("failed")
    }
  }

  /** the success screen's "Email me a confirmation" (chat orders, which never ask for an email address) */
  function emailPlacedOrder() {
    if (!placedOrder) return
    const email = customerEmail.trim()
    if (!emailPattern.test(email)) {
      setEmailFieldError("Enter a valid email address.")
      return
    }
    const withEmail = { ...placedOrder, email }
    setPlacedOrder(withEmail)
    setEmailFieldError(null)
    setEmailStatus("sending")
    void sendConfirmationEmail(withEmail, placedItemsRef.current)
  }

  /** "Place order" in the popup */
  function placeOrder() {
    if (orderSubs.length === 0) return
    const isDelivery = fulfillment === "delivery"
    const trimmedName = pickupName.trim()
    const trimmedEmail = customerEmail.trim()
    const trimmedAddress = deliveryAddress.trim()
    if (!trimmedName) {
      setCheckoutError("Add a name for the order.")
      return
    }
    if (!emailPattern.test(trimmedEmail)) {
      setCheckoutError("Add a valid email address so we can send your confirmation.")
      return
    }
    if (isDelivery && !trimmedAddress) {
      setCheckoutError("Add a delivery address.")
      return
    }
    if (!getPickupChoices(new Date()).isAllowed(pickupTime)) {
      setNow(new Date())
      setCheckoutError(
        `Choose a ${isDelivery ? "delivery" : "pickup"} time between 9 AM and 9 PM, at least 15 minutes from now.`
      )
      return
    }

    const orderId = `order-${Date.now()}`
    const items = orderSubs
    saveCompletedOrder({
      id: orderId,
      ...(user ? { account_id: user.id } : {}),
      fulfillment,
      ...(isDelivery ? { deliveryAddress: trimmedAddress } : {}),
      pickupName: trimmedName,
      pickupTime,
      items: items.map((item) => ({
        ...item,
        ...(user ? { account_id: user.id } : {}),
        toppingAmounts: { ...item.toppingAmounts },
      })),
      total: cartTotal,
      createdAt: new Date().toISOString(),
      source: "manual",
    })

    const placed: PlacedOrder = {
      id: orderId,
      name: trimmedName,
      email: trimmedEmail,
      fulfillment,
      time: pickupTime,
      address: trimmedAddress,
      total: cartTotal,
      subCount: cartCount,
    }
    // the popup switches to the checkmark screen; the email goes out in the background
    placedItemsRef.current = items
    setPlacedOrder(placed)
    setEmailStatus("sending")
    setCheckoutError(null)
    setCartItems([])
    setCartOpen(false)
    clearPreview()
    setCheckoutMessage(
      isDelivery
        ? `Order confirmed for ${trimmedName}. Delivery to ${trimmedAddress}: ${pickupTime}.`
        : `Order confirmed for ${trimmedName}. Pickup: ${pickupTime}.`
    )
    void sendConfirmationEmail(placed, items)
  }

  useEffect(() => {
    if (initRef.current) return
    initRef.current = true

    let restoredCart: CartItem[] = []
    try {
      const savedCart = localStorage.getItem(cartStorageKey)
      if (savedCart) {
        const parsed = JSON.parse(savedCart) as CartItem[]
        if (Array.isArray(parsed)) {
          restoredCart = parsed
          setCartItems(parsed)
        }
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
            fulfillment?: Fulfillment
            deliveryAddress?: string
            customerEmail?: string
            editingId?: string | null
          }
          setCustomerEmail(draft.customerEmail ?? "")
          // the draft may be an edit of a bag sub: carry on editing it if that sub is still in the bag
          if (draft.editingId && restoredCart.some((item) => item.id === draft.editingId)) {
            setEditingId(draft.editingId)
          }
          setToppingAmounts({ ...emptyToppingAmounts, ...(draft.toppingAmounts ?? {}) })
          setSandwichSize(draft.sandwichSize ?? "6-inch")
          setQuantity(Math.max(1, draft.quantity ?? 1))
          setChatMessages(Array.isArray(draft.chatMessages) ? draft.chatMessages : [])
          setChatSessionId(draft.chatSessionId ?? null)
          setPickupName(draft.pickupName ?? "")
          setPickupTime(toPickupValue(draft.pickupTime ?? ""))
          setFulfillment(draft.fulfillment === "pickup" ? "pickup" : "delivery")
          setDeliveryAddress(draft.deliveryAddress ?? "")

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
      fulfillment,
      deliveryAddress,
      customerEmail,
      editingId,
    }
    localStorage.setItem(draftStorageKey, JSON.stringify(draft))
  }, [isHydrated, user, toppingAmounts, sandwichSize, quantity, chatMessages, chatSessionId, pickupName, pickupTime, fulfillment, deliveryAddress, customerEmail, editingId])

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
        /* Keep the top navbar a single solid colour across the entire order page */
        body:has(.order-section) nav { background-color: #e4e8e5; border-bottom: 1px solid rgba(31, 35, 33, 0.1); }
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

        /* loading screen: covers the page (the navbar stays above it) until the first-screen pictures have loaded */
        .page-loader { position: fixed; inset: 0; z-index: 40; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; padding: 0 16px; background-color: var(--bg); transition: opacity 0.4s ease, visibility 0s linear 0.4s; }
        .page-loader.done { opacity: 0; visibility: hidden; pointer-events: none; }
        .loader-title { margin: 0; font-size: clamp(1.3rem, 2.4vw, 1.9rem); font-weight: 700; letter-spacing: -0.04em; color: var(--text); }
        .loader-percent { margin: 0; font-size: 0.96rem; font-weight: 700; color: var(--text-muted); font-variant-numeric: tabular-nums; }
        /* both subs sit in the same grid cell, bottoms aligned, so the coloured one lines up exactly over the grey one */
        .loader-bar { display: grid; width: min(620px, 86vw); }
        .loader-bar > .sandwich-side-stack { grid-area: 1 / 1; align-self: end; }
        .loader-ghost { opacity: 0.22; filter: grayscale(1); }
        /* inset(top right bottom left): the right side is cut away by whatever is still left to load */
        .loader-fill { clip-path: inset(-30% calc((1 - var(--progress, 0)) * 100%) -30% -10%); transition: clip-path 0.25s ease; }

        .order-shell { width: 100%; height: 100%; margin: 0 auto; border-radius: 18px; }

        /* no frame: the panels sit straight on the chalk background */
        .order-card { height: 100%; display: flex; flex-direction: column; }
        .layout { flex: 1; min-height: 0; display: grid; grid-template-columns: 1.28fr 1fr; gap: 18px; }
        /* container-type lets .image-stage size itself from this column's width (cqw units) */
        .product-panel { background: transparent; padding: calc(10vh + 14px) 0 16px; display: flex; flex-direction: column; min-height: 0; overflow: hidden; container-type: inline-size; }
        .panel-label { display: flex; align-items: center; justify-content: space-between; color: var(--text-muted); text-transform: uppercase; font-size: 0.86rem; letter-spacing: 0.12em; margin-bottom: 6px; }
        .panel-label .mini-pill { border: 1px solid var(--line); border-radius: 999px; padding: 4px 7px; background: var(--surface-raised); }
        .start-over-button { border: 1px solid var(--line-strong); border-radius: 999px; padding: 5px 10px; background: rgba(20, 17, 16, 0.6); color: #fff; font-size: 0.8rem; font-weight: 700; text-transform: none; letter-spacing: normal; cursor: pointer; }
        .start-over-button:hover:not(:disabled) { background: rgba(20, 17, 16, 0.8); }
        .start-over-button:disabled { opacity: 0.5; cursor: not-allowed; }
        .product-panel h1 { margin: 4px 0 0; font-size: clamp(1.8rem, 3vw, 2.6rem); line-height: 1.05; letter-spacing: -0.06em; font-weight: 700; color: var(--text); }
        /* Full-height stage lowered below the single-colour header; board sits low on the wooden counter */
        .image-stage { flex: 1 1 auto; min-height: 280px; margin: 0; border-radius: 18px; background-color: #3a2f28; background-size: cover; background-position: center bottom; background-repeat: no-repeat; position: relative; overflow: hidden; box-shadow: inset 0 0 0 1px rgba(0,0,0,0.2), 0 14px 32px rgba(31, 35, 33, 0.14); padding: 16px 16px var(--board-lift, 26px); display: flex; flex-direction: column; justify-content: flex-end; }
        /* sits in the strip under the board instead of taking its own row */
        .image-stage > .preview-meta { position: absolute; left: 50%; bottom: 6px; transform: translateX(-50%); margin: 0; z-index: 1; white-space: nowrap; }
        .stage-heading { position: absolute; inset: 0; z-index: 2; pointer-events: none; }
        .stage-heading > * { pointer-events: auto; }
        .stage-heading .panel-label { position: absolute; top: 18px; right: 18px; margin: 0; gap: 10px; justify-content: flex-end; color: #fff; text-shadow: 0 1px 6px rgba(30, 20, 12, 0.7); }
        .product-panel .stage-heading h1 { position: absolute; top: 14px; left: 20px; margin: 0; white-space: nowrap; color: #fff; text-shadow: 0 2px 10px rgba(30, 20, 12, 0.55); }
        /* The stack is built bottom-up (column-reverse) so each higher layer paints over the one below.
           Layers overlap via negative margins, worked out from each PNG's measured food edges
           (percentages resolve against .sandwich-build's width):
             margin-top    = -(where the next layer should land, measured from this image's top)
             margin-bottom = -(transparent space under this image's visible content)            */
        .sandwich-build { position: relative; z-index: 1; width: min(460px, 62%); margin: 0 auto; display: flex; flex-direction: column-reverse; align-items: center; }
        /* the order's other subs: same size and height as the one in the middle, slightly smaller (further away),
           pushed off the stage so only their inner end shows. --peek is how much of each is hidden off the edge */
        .sandwich-build.neighbor-sub { --peek: 68%; position: absolute; z-index: 0; bottom: var(--board-lift, 26px); margin: 0; opacity: 0.85; pointer-events: none; }
        .neighbor-sub.left { left: 0; transform: translateX(calc(-1 * var(--peek))) scale(0.88); transform-origin: right bottom; }
        .neighbor-sub.right { right: 0; transform: translateX(var(--peek)) scale(0.88); transform-origin: left bottom; }
        /* hover areas over the two edges: their arrow only shows while the mouse is in the area (always on touch screens) */
        .sub-nav { position: absolute; top: 22%; bottom: 0; width: 22%; z-index: 3; display: flex; align-items: center; }
        .sub-nav.left { left: 0; justify-content: flex-start; padding-left: 12px; }
        .sub-nav.right { right: 0; justify-content: flex-end; padding-right: 12px; }
        .sub-nav-arrow { border: 0; padding: 0; background: transparent; border-radius: 50%; cursor: pointer; opacity: 0; transform: scale(0.9); transition: opacity 0.2s ease, transform 0.2s ease; filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.35)); }
        .sub-nav-arrow img { display: block; width: 44px; height: 44px; }
        .sub-nav:hover .sub-nav-arrow, .sub-nav-arrow:focus-visible { opacity: 1; transform: scale(1); }
        .sub-nav .sub-nav-arrow:hover { transform: scale(1.08); }
        @media (hover: none) { .sub-nav-arrow { opacity: 1; transform: none; } }
        /* margin-bottom tucks away the transparent strip under the board (117 of the PNG's 512px = 7.62% of its width) */
        .sandwich-build > .plate { transform: scaleX(1.1); width: 100%; height: auto; margin-top: -15%; margin-bottom: -7.62%; pointer-events: none; filter: drop-shadow(0 10px 12px rgba(40, 26, 17, 0.25)); }
        /* a row of bowls on the counter just in front of the board, centred under the sandwich (clear of the
           neighbouring subs at the edges, and kept above the caption pill at the bottom) */
        .sauce-bowls { position: absolute; left: 50%; transform: translateX(-50%); bottom: max(calc(var(--board-lift, 26px) * 0.3), 30px); z-index: 2; display: flex; align-items: flex-end; justify-content: center; gap: 10px; pointer-events: none; }
        .sauce-bowls img { width: clamp(64px, 11cqw, 115px); height: auto; filter: drop-shadow(0 6px 5px rgba(40, 26, 17, 0.35)); }
        /* everything on the board. --stretch-x lengthens both sizes; the oversized insets leave room for overlaps and shadows */
        .sandwich-stack { --stretch-x: 1.12; width: 100%; display: flex; flex-direction: column-reverse; align-items: center; clip-path: inset(-100% -20% -100% -20%); transform: translateX(0) scaleX(var(--stretch-x)); transition: clip-path 0.3s ease, transform 0.3s ease; }
        /* 6-inch = a footlong cut in half: hide the right half, then slide the rest back to the board's centre
           (the sandwich spans ~7–93% of the board, so its left half is centred at 28.5%: 50 - 28.5 = 21.5) */
        .sandwich-stack.six-inch { clip-path: inset(-100% 50% -100% -20%); transform: translateX(calc(21.5% * var(--stretch-x))) scaleX(var(--stretch-x)); }
        /* on a wrapper, so the shadow is drawn after the cut and falls beside the cut end. plain CSS shadows only: an SVG
           url(#filter) here was rasterised in tiles by Chrome's GPU path, leaving blocky gaps and shifted strips in the sub */
        .sandwich-cut { width: 100%; }
        .sandwich-cut.six-inch { filter: drop-shadow(4px 2px 5px rgba(30, 18, 10, 0.1)); }
        .layer { display: block; width: 88%; height: auto; pointer-events: none; filter: drop-shadow(0 3px 4px rgba(40, 26, 17, 0.28)); }
        /* fillings and the bottom bread get their width + margins inline (see layerStyle) because each PNG has different padding */
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
          font-size: 0.8rem;
          font-weight: 700;
          color: #fff;
          text-shadow: 0 1px 2px rgba(0,0,0,0.75);
        }
        .preview-meta {
          margin: 8px auto 0;
          padding: 4px 12px;
          width: fit-content;
          border-radius: 999px;
          background: rgba(20, 17, 16, 0.72);
          text-align: center;
          font-size: 0.86rem;
          color: #fff;
        }

        .builder-panel { position: relative; background: transparent; padding: calc(10vh + 14px) 18px 16px; display: flex; flex-direction: column; min-height: 0; overflow: hidden; }
        .mode-switcher { position: relative; flex: none; display: grid; grid-template-columns: 1fr 1fr; gap: 6px; padding: 4px; margin-bottom: 12px; border-radius: 999px; background: var(--surface-raised); border: 1px solid var(--line); box-shadow: 0 4px 12px rgba(31, 35, 33, 0.06); }
        .mode-tab { border: 0; border-radius: 999px; background: transparent; color: var(--text-muted); padding: 9px 14px; font-size: 0.94rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 7px; }
        .mode-tab:hover { color: var(--text); }
        .mode-tab.active { background: var(--text); color: var(--bg); box-shadow: 0 4px 10px rgba(31, 35, 33, 0.2); }
        .mode-tab svg { width: 15px; height: 15px; flex: none; }
        .mode-live-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--accent); animation: pulseDot 1.2s ease-in-out infinite; }
        @keyframes pulseDot { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.75); } }

        .mode-stage { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }
        .mode-panel { position: relative; flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }

        .builder-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .builder-title { margin: 0; font-size: clamp(1.5rem, 2vw, 2.2rem); line-height: 1.1; letter-spacing: -0.05em; font-weight: 700; color: var(--text); }
        .builder-tabs { display: flex; gap: 10px; list-style: none; margin: 0 0 10px; padding: 0; flex-wrap: wrap; }
        .tab-button { border: 1px solid var(--line); border-radius: 999px; color: var(--text-muted); background: var(--surface-raised); font-size: 0.9rem; font-weight: 600; padding: 8px 14px; cursor: pointer; transition: all 0.2s ease; }
        .tab-button:hover { color: var(--text); background: var(--surface-hover); }
        .tab-button.active { background: var(--text); color: var(--bg); border-color: var(--text); }
        /* the Suggestion tab is tinted with the accent so it stands out from the ingredient tabs */
        .tab-button.suggestion-tab { background: rgba(214, 42, 42, 0.1); border-color: rgba(214, 42, 42, 0.35); color: var(--accent); }
        .tab-button.suggestion-tab:hover { background: rgba(214, 42, 42, 0.18); color: var(--accent); }
        .tab-button.suggestion-tab.active { background: var(--accent); border-color: var(--accent); color: #fff; }

        /* takes whatever height is left in the column and scrolls inside itself; the 4px padding keeps the
           selected cards' outline from being clipped at the scroll edges */
        .topping-grid { flex: 1 1 auto; min-height: 0; overflow-y: auto; scrollbar-width: thin; align-content: start; display: grid; grid-auto-rows: max-content; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin: 0 -4px; padding: 4px; }
        .topping-item { overflow: hidden; background: var(--surface-raised); border: 1px solid var(--line); border-radius: 14px; padding: 14px 8px 12px; text-align: center; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 10px; min-height: 180px; }
        .topping-item.selected { border-color: var(--accent); box-shadow: 0 0 0 2px rgba(224, 54, 47, 0.25); }
        /* the whole card is clickable (picks it with its default size/portion) */
        .topping-item, .suggestion-item { cursor: pointer; transition: background 0.15s ease; }
        .topping-item:hover, .suggestion-item:hover { background: var(--surface-hover); }
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
        .topping-item .name { font-size: 0.98rem; color: var(--text-muted); font-weight: 600; }
        .topping-item.selected .name { color: var(--text); }
        .size-picker { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 6px; max-width: 100%; }
        .size-picker.portion-picker { gap: 4px; }
        .size-button { border: 1px solid var(--line-strong); border-radius: 999px; background: var(--field); color: var(--text-muted); padding: 6px 10px; font-size: 0.82rem; font-weight: 700; line-height: 1; white-space: nowrap; cursor: pointer; transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease; }
        .size-picker.portion-picker .size-button { padding: 6px 7px; font-size: 0.8rem; }
        .size-button:hover:not(:disabled):not(.active):not(.over-limit) { background: rgba(31, 35, 33, 0.06); color: var(--text); border-color: var(--text-muted); }
        .size-button.active { color: var(--bg); background: var(--text); border-color: var(--text); }
        .size-button:disabled, .size-button.over-limit { color: var(--text-faint); opacity: 0.5; cursor: not-allowed; }

        /* portion-limit reminder: slides in at the top of the right-hand panel */
        .limit-notice { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: min(360px, calc(100% - 24px)); z-index: 5; display: flex; align-items: flex-start; gap: 10px; padding: 12px 12px 12px 14px; border-radius: 14px; background: var(--field); border: 1px solid rgba(179, 38, 30, 0.35); border-left: 4px solid var(--accent); box-shadow: 0 14px 30px rgba(31, 35, 33, 0.18); animation: noticeIn 0.25s ease-out; }
        .limit-notice strong { display: block; font-size: 0.98rem; color: var(--text); }
        .limit-notice p { margin: 2px 0 0; font-size: 0.86rem; line-height: 1.4; color: var(--text-muted); }
        .limit-notice-close { flex: none; margin-left: auto; border: 0; background: transparent; color: var(--text-muted); font-size: 1.1rem; line-height: 1; cursor: pointer; padding: 2px 4px; border-radius: 6px; }
        .limit-notice-close:hover { color: var(--text); background: var(--surface-hover); }
        @keyframes noticeIn { from { opacity: 0; transform: translate(-50%, -50%) scale(0.94); } to { opacity: 1; transform: translate(-50%, -50%); } }

        /* Suggestion tab: one card per ready-made sub, the whole card is the button */
        .suggestion-item { text-align: left; background: var(--surface-raised); border: 1px solid var(--line); border-radius: 14px; padding: 10px 10px 12px; display: flex; flex-direction: column; gap: 4px; color: var(--text); }
        .suggestion-item .size-picker { margin-top: 6px; }
        .suggestion-item.selected { border-color: var(--accent); box-shadow: 0 0 0 2px rgba(224, 54, 47, 0.25); }
        .suggestion-thumb { position: relative; width: 100%; aspect-ratio: 3 / 2; margin-bottom: 4px; border-radius: 10px; overflow: hidden; display: flex; align-items: flex-end; justify-content: center; padding: 0 8% 10%; background: radial-gradient(ellipse 70% 30% at 50% 88%, rgba(40, 26, 17, 0.16), transparent 70%); }
        .sandwich-side-stack { width: 100%; display: flex; flex-direction: column-reverse; align-items: center; }
        .suggestion-sauces { position: absolute; right: 4px; bottom: 4px; display: flex; }
        .suggestion-sauces img { width: clamp(20px, 22%, 34px); height: auto; filter: drop-shadow(0 2px 3px rgba(40, 26, 17, 0.3)); }
        .suggestion-name { font-size: 1.03rem; font-weight: 700; }
        .suggestion-detail { font-size: 0.8rem; line-height: 1.35; color: var(--text-muted); }
        .suggestion-price { margin-top: auto; padding-top: 4px; font-size: 0.94rem; font-weight: 700; }

        .builder-summary { margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--line); display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: 0.84rem; color: var(--text); }
        .pricing-note { flex: none; margin: 6px 0 0; font-size: 0.8rem; color: var(--text-muted); }
        .builder-summary-left { display: flex; align-items: center; gap: 8px; min-width: 0; }
        .undo-button { border: 1px solid var(--line-strong); border-radius: 999px; background: var(--surface-raised); padding: 4px 8px; color: var(--text); font-size: 0.82rem; font-weight: 700; cursor: pointer; }
        .undo-button:hover:not(:disabled) { background: var(--surface-hover); }
        .undo-button:disabled { opacity: 0.65; cursor: not-allowed; }
        .summary-pill { display: inline-flex; align-items: center; gap: 7px; padding: 4px 8px; border: 1px solid var(--line); border-radius: 999px; background: var(--surface-raised); }
        .summary-pill strong { color: var(--text); }

        .order-column { flex: none; margin-top: 12px; }

        /* Chat popup panel that swaps in place of the ingredient menu on the right */
        .chat-popup { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; background: var(--surface-raised); border: 1px solid var(--line); border-radius: 18px; box-shadow: 0 14px 30px rgba(31, 35, 33, 0.11); overflow: hidden; }
        /* staff on the left, conversation on the right, like a messaging app (the other person left, you right) */
        .chat-popup-body { flex: 1 1 auto; min-height: 0; display: grid; grid-template-columns: clamp(175px, 40%, 240px) minmax(0, 1fr); grid-template-rows: minmax(0, 1fr); }
        .chat-conversation { min-width: 0; min-height: 0; padding: 12px 14px 10px 6px; display: flex; flex-direction: column; gap: 8px; overflow: hidden; }
        .chat-kicker { flex: none; margin: 0; font-size: 0.82rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted); }
        .chat-staff { position: relative; min-height: 220px; background: radial-gradient(ellipse 85% 55% at 50% 100%, rgba(214, 42, 42, 0.12), transparent 72%); }
        .chat-staff img { position: absolute; inset: 0; width: 100%; height: 100%; padding-top: 8px; object-fit: contain; object-position: center bottom; transform-origin: 50% 100%; filter: drop-shadow(0 6px 10px rgba(31, 35, 33, 0.18)); pointer-events: none; }
        /* while busy, the staff member gently grows and shrinks (from the feet, so he stays standing in place) */
        .chat-staff.processing img { animation: staffPulse 1.4s ease-in-out infinite; }
        @keyframes staffPulse { 50% { transform: scale(1.03); } }
        .avatar-status { position: absolute; left: 50%; bottom: 10px; transform: translateX(-50%); max-width: calc(100% - 14px); width: max-content; display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 999px; background: rgba(255, 255, 255, 0.94); box-shadow: 0 2px 8px var(--shadow); font-size: 0.8rem; font-weight: 700; line-height: 1.25; color: var(--text); text-align: center; }
        .chat-staff.error .avatar-status { color: var(--danger); box-shadow: 0 0 0 2px rgba(179, 38, 30, 0.25); }

        .chat-log { flex: 1 1 0; min-height: 90px; overflow-x: hidden; overflow-y: auto; scrollbar-width: thin; background: transparent; display: flex; flex-direction: column; gap: 10px; padding: 2px 2px 6px; }
        /* the staff's bubble: light, on the left beside the staff member, square bottom-left corner pointing at them */
        .speech { flex: none; align-self: flex-start; margin: 0; position: relative; background: var(--field); border: 2px solid var(--text); border-radius: 18px 18px 18px 0; padding: 10px 14px 8px; max-width: 100%; overflow-wrap: anywhere; box-shadow: 0 6px 14px var(--shadow); }
        .speech p { margin: 0; font-size: 1.03rem; line-height: 1.4; color: var(--text); }
        /* the customer's bubble: dark, on the right, square bottom-right corner */
        .speech.from-user { align-self: flex-end; margin: 0; background: var(--text); border-color: var(--text); border-radius: 18px 18px 0 18px; }
        .speech.from-user p { color: var(--bg); }
        .speech .tiny { font-size: 0.82rem; opacity: 0.85; margin-top: 6px; color: var(--text-muted); }
        .chat-footer { flex: none; padding: 10px 14px 12px; border-top: 1px solid var(--line); display: flex; flex-direction: column; gap: 8px; }
        .chat-controls { flex: none; display: flex; flex-direction: column; gap: 8px; }
        .chat-error { flex: none; font-size: 0.86rem; color: var(--danger); }
        .retry-button { border: 0; background: transparent; color: var(--danger); font-weight: 700; text-decoration: underline; cursor: pointer; padding: 0 0 0 4px; }
        .chat-form { display: flex; gap: 8px; }
        .chat-input { flex: 1; border: 1px solid var(--line-strong); border-radius: 999px; padding: 8px 13px; font-size: 0.91rem; background: var(--field); color: var(--text); }
        .chat-input::placeholder, .checkout-input::placeholder { color: var(--text-faint); }
        .chat-send { border: 0; border-radius: 999px; background: var(--text); color: var(--bg); font-size: 0.86rem; font-weight: 700; padding: 8px 14px; cursor: pointer; }
        .chat-send:disabled { opacity: 0.4; cursor: not-allowed; }
        .voice-controls { display: flex; align-items: center; gap: 8px; }
        .voice-button { border: 1px solid var(--line-strong); border-radius: 999px; background: var(--field); color: var(--text); padding: 8px 12px; font-size: 0.86rem; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 6px; transition: background 0.18s ease, box-shadow 0.18s ease, color 0.18s ease; }
        .voice-button svg { width: 14px; height: 14px; flex: none; }
        .voice-button:hover:not(:disabled) { background: var(--surface-hover); }
        /* "Voice replies: On" */
        .voice-button.on { border-color: var(--accent); background: rgba(214, 42, 42, 0.1); color: var(--accent); }
        .voice-button.on:hover:not(:disabled) { background: rgba(214, 42, 42, 0.18); }
        .voice-button:disabled { opacity: 0.48; cursor: not-allowed; }
        .voice-button.primary { flex: 1; border-color: transparent; background: var(--text); color: var(--bg); }
        .voice-button.primary:hover:not(:disabled) { background: #313734; }
        .voice-button.primary.listening { background: var(--accent); color: #fff; box-shadow: 0 0 0 4px rgba(214, 42, 42, 0.22); }
        .voice-button.primary.listening:hover:not(:disabled) { background: var(--accent-hover); }
        .heard-card { flex: none; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 9px 10px; border: 1px solid var(--line); border-radius: 12px; background: var(--field); font-size: 0.84rem; color: var(--text-muted); }
        .heard-card strong { display: block; margin-bottom: 2px; color: var(--text); }
        .heard-actions { display: flex; gap: 5px; }
        .chat-help { flex: none; margin: 0; font-size: 0.8rem; line-height: 1.35; color: var(--text-muted); }
        .privacy-note { flex: none; margin: 0; font-size: 0.8rem; line-height: 1.35; color: var(--text-faint); }

        .order-summary { background: var(--surface-raised); border: 1px solid var(--line); border-radius: 16px; padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
        .summary-meta { color: var(--text); font-size: 0.86rem; letter-spacing: 0.08em; text-transform: uppercase; }
        .summary-main { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-top: 10px; }
        .summary-main .price { font-size: 2.1rem; letter-spacing: -0.06em; font-weight: 800; color: var(--text); }
        .summary-main .price small { font-size: 0.96rem; color: var(--text); font-weight: 600; letter-spacing: 0.03em; margin-left: 6px; }
        .qty-box { display: flex; align-items: center; gap: 8px; background: var(--field); border: 1px solid var(--line); border-radius: 999px; padding: 6px 8px; font-weight: 700; color: var(--text); }
        .operator { width: 28px; height: 28px; border-radius: 50%; border: 0; display: grid; place-items: center; background: var(--surface-hover); color: var(--text); cursor: pointer; font-size: 1rem; line-height: 1; }
        .operator:disabled { cursor: not-allowed; opacity: 0.45; }
        .cta-button { border: none; border-radius: 999px; background: var(--accent); color: #fff; font-weight: 700; padding: 12px 22px; box-shadow: 0 12px 18px rgba(224, 54, 47, 0.25); cursor: pointer; transition: background 0.2s ease; }
        .cta-button:hover:not(:disabled) { background: var(--accent-hover); }
        /* "Added to bag ✓": done, until the next ingredient or suggestion starts a new sub */
        .cta-button:disabled { background: var(--text); box-shadow: none; cursor: default; }
        .confirmation { margin-top: 7px; font-size: 0.86rem; color: var(--text); max-width: 220px; }
        .order-error { margin: 7px 0 0; font-size: 0.86rem; color: var(--danger); max-width: 260px; }
        .cart-panel { margin-top: 10px; padding: 12px; border: 1px solid var(--line); border-radius: 14px; background: var(--surface-raised); }
        .cart-heading { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 0.94rem; }
        .cart-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 7px; max-height: 18vh; overflow-y: auto; scrollbar-width: thin; }
        .cart-item { display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: start; padding: 8px; border-radius: 10px; background: var(--field); font-size: 0.84rem; }
        .cart-item p { margin: 2px 0 0; color: var(--text-muted); }
        .cart-item.editing { box-shadow: inset 3px 0 0 var(--accent); }
        .editing-tag { border: 1px solid rgba(214, 42, 42, 0.35); border-radius: 999px; background: rgba(214, 42, 42, 0.08); padding: 4px 8px; font-size: 0.82rem; font-weight: 700; color: var(--accent); white-space: nowrap; }
        /* Edit / Remove / On the counter: same pill frame, spaced apart */
        .cart-actions { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
        .cart-remove { border: 1px solid rgba(179, 38, 30, 0.35); border-radius: 999px; background: var(--surface-raised); padding: 4px 8px; color: var(--danger); font-size: 0.82rem; font-weight: 700; cursor: pointer; }
        .cart-remove:hover { background: rgba(179, 38, 30, 0.08); }
        .fulfillment-picker { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-top: 10px; padding: 3px; border: 1px solid var(--line); border-radius: 999px; background: var(--field); }
        .fulfillment-button { border: 0; border-radius: 999px; background: transparent; color: var(--text-muted); padding: 7px 10px; font-size: 0.86rem; font-weight: 700; cursor: pointer; }
        .fulfillment-button:hover:not(.active) { color: var(--text); background: var(--surface-hover); }
        .fulfillment-button.active { background: var(--text); color: var(--bg); }
        .checkout-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px; }
        .checkout-wide { grid-column: 1 / -1; }
        .checkout-input { border: 1px solid var(--line-strong); border-radius: 999px; padding: 8px 10px; background: var(--field); color: var(--text); font-size: 0.86rem; }
        .cart-total-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-top: 10px; font-size: 0.91rem; font-weight: 700; }
        .checkout-button { border: 0; border-radius: 999px; background: var(--accent); color: #fff; padding: 8px 12px; font-size: 0.84rem; font-weight: 700; cursor: pointer; }
        .checkout-button:hover { background: var(--accent-hover); }
        /* checkout popup: above everything, navbar included */
        .checkout-overlay { position: fixed; inset: 0; z-index: 60; display: flex; align-items: center; justify-content: center; padding: 16px; background: rgba(20, 17, 16, 0.45); backdrop-filter: blur(2px); animation: overlayIn 0.2s ease-out; }
        .checkout-dialog { width: min(440px, 100%); max-height: calc(100dvh - 32px); overflow-y: auto; background: var(--field); border-radius: 20px; padding: 22px; box-shadow: 0 24px 60px rgba(0, 0, 0, 0.25); }
        .checkout-dialog h2 { margin: 0; font-size: 1.4rem; letter-spacing: -0.03em; color: var(--text); }
        .checkout-form { display: flex; flex-direction: column; gap: 12px; }
        .checkout-form .fulfillment-picker { margin-top: 0; }
        .checkout-summary { margin: 0; font-size: 0.96rem; line-height: 1.5; color: var(--text-muted); }
        .checkout-field { display: flex; flex-direction: column; gap: 5px; font-size: 0.86rem; font-weight: 700; color: var(--text-muted); }
        .checkout-dialog .checkout-input { border-radius: 12px; padding: 10px 12px; font-size: 1.03rem; font-weight: 400; }
        .checkout-error { margin: 0; font-size: 0.91rem; color: var(--danger); }
        .checkout-actions { display: flex; justify-content: flex-end; align-items: center; flex-wrap: wrap; gap: 8px; margin-top: 4px; }
        .checkout-cancel { border: 1px solid var(--line-strong); border-radius: 999px; background: transparent; padding: 10px 16px; color: var(--text); font-weight: 700; cursor: pointer; }
        .checkout-cancel:hover { background: var(--surface-hover); }
        /* success screen: a green circle is drawn, then the tick (stroke-dash "drawing" of each path) */
        .checkout-success { display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center; padding: 6px 0; }
        .success-check { width: 96px; height: 96px; }
        .success-check circle { fill: none; stroke: #2e9d57; stroke-width: 5; stroke-dasharray: 277; stroke-dashoffset: 277; transform: rotate(-90deg); transform-origin: center; animation: drawStroke 0.6s ease-out forwards; }
        .success-check path { fill: none; stroke: #2e9d57; stroke-width: 6; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 61; stroke-dashoffset: 61; animation: drawStroke 0.35s ease-out 0.6s forwards; }
        @keyframes drawStroke { to { stroke-dashoffset: 0; } }
        @keyframes overlayIn { from { opacity: 0; } to { opacity: 1; } }
        .email-status { margin: 0; font-size: 0.91rem; color: var(--text-muted); }
        .email-request { width: 100%; display: flex; flex-direction: column; gap: 8px; text-align: left; }
        .email-request .checkout-cancel { align-self: center; }
        .email-status.sent { color: #2e7d4f; }
        .email-status.failed { color: var(--danger); }
        .checkout-message { margin: 8px 0 0; font-size: 0.84rem; color: var(--text-muted); }
        button:focus-visible, input:focus-visible { outline: 3px solid rgba(240, 74, 66, 0.6); outline-offset: 2px; }

        /* single column on narrow screens: too much to fit in one screen, so the page scrolls normally again */
        @media (max-width: 980px) {
          .order-section { height: auto; min-height: 100vh; overflow: visible; padding-bottom: 18px; }
          .order-shell, .order-card { height: auto; }
          .layout { grid-template-columns: 1fr; }
          .product-panel { padding: calc(10vh + 12px) 0 0; overflow: visible; }
          .image-stage { flex: none; aspect-ratio: 1536 / 900; min-height: 260px; margin: 0; }
          .builder-panel { padding-top: 16px; overflow: visible; }
          .mode-stage, .mode-panel { overflow: visible; }
          /* the panel is taller than the screen here, so centre the reminder on the screen instead */
          .limit-notice { position: fixed; z-index: 45; }
          .topping-grid { overflow: visible; }
          .chat-popup { min-height: 440px; max-height: 70vh; }
        }

        @media (max-width: 700px) {
          .product-panel .stage-heading h1 { top: 44px; left: 16px; }
          .builder-tabs { justify-content: center; }
          .topping-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .summary-main { flex-direction: column; align-items: flex-start; }
          .chat-popup-body { grid-template-columns: 130px minmax(0, 1fr); }
          .voice-controls { flex-wrap: wrap; }
          .checkout-grid { grid-template-columns: 1fr; }
        }

        @media (prefers-reduced-motion: reduce) {
          .chat-staff.processing img, .mode-live-dot { animation: none; }
          .sandwich-stack, .loader-fill, .page-loader { transition: none; }
          .limit-notice { animation: none; }
          .sub-nav-arrow { transition: none; }
          .checkout-overlay { animation: none; }
          .success-check circle, .success-check path { animation: none; stroke-dashoffset: 0; }
        }
`}</style>

      {/* stays mounted and fades out, so finishing doesn't make the page jump */}
      <div className={`page-loader${pageLoading ? "" : " done"}`} aria-hidden={!pageLoading}>
        <p className="loader-title">Preparing your counter…</p>
        <div
          className="loader-bar"
          role="progressbar"
          aria-label="Loading the order page"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(loadProgress * 100)}
          style={{ "--progress": loadProgress } as CSSProperties}
        >
          {/* a faded grey sub shows the full length; the coloured one on top is revealed left to right */}
          <SandwichStack amounts={loaderAmounts} className="loader-ghost" />
          <SandwichStack amounts={loaderAmounts} className="loader-fill" />
        </div>
        <p className="loader-percent">{Math.round(loadProgress * 100)}%</p>
      </div>

      <div className="order-shell">
        <div className="order-card">
          <div className="layout">
            <div className="product-panel">
              <div
                ref={stageRef}
                className="image-stage"
                aria-label="Live sandwich preview"
                style={{
                  backgroundImage: `linear-gradient(to bottom, rgba(20, 14, 10, 0.52) 0%, rgba(20, 14, 10, 0) 24%), url(${assemblecounter})`,
                  ...(boardLift !== null ? { "--board-lift": `${boardLift}px` } : {}),
                } as CSSProperties}
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
                    {previewTopLayer ? <img className="layer" src={previewTopLayer} alt="" style={topBreadStyle(previewTopLayer)} /> : null}
                  </div>
                  </div>
                </div>
                {/* the order's other subs peek in from the edges; hovering an edge shows its arrow */}
                {leftNeighbor ? <NeighborSub item={leftNeighbor} side="left" /> : null}
                {rightNeighbor ? <NeighborSub item={rightNeighbor === "new" ? null : rightNeighbor} side="right" /> : null}
                <div className="sauce-bowls" aria-hidden="true">
                  {previewSauces.map((option) => (
                    <img key={option.name} src={option.side} alt="" />
                  ))}
                </div>
                {leftNeighbor ? (
                  <div className="sub-nav left">
                    <button
                      type="button"
                      className="sub-nav-arrow"
                      onClick={() => switchToSub(leftNeighbor)}
                      aria-label={`Previous sub (sub ${currentSlot} of ${subCount})`}
                    >
                      <img src={arrowLeft} alt="" />
                    </button>
                  </div>
                ) : null}
                {rightNeighbor ? (
                  <div className="sub-nav right">
                    <button
                      type="button"
                      className="sub-nav-arrow"
                      onClick={() => switchToSub(rightNeighbor)}
                      aria-label={rightNeighbor === "new" ? "Start a new sub" : `Next sub (sub ${currentSlot + 2} of ${subCount})`}
                    >
                      <img src={arrowRight} alt="" />
                    </button>
                  </div>
                ) : null}
                <div className="preview-meta">
                  {addedOnCounter ? "In your bag ✓ · " : ""}
                  {subCount > 1 ? `Sub ${currentSlot + 1} of ${subCount} · ` : ""}
                  {previewPortionCount === 0 && !hasBread
                    ? "Select toppings or switch to Voice & Chat"
                    : `${sandwichSize} · ${previewPortionCount} ingredient portion${previewPortionCount === 1 ? "" : "s"} selected`}
                </div>
              </div>
            </div>

            <div className="builder-panel">
              <div className="mode-switcher" role="tablist" aria-label="Ordering mode">
                <button
                  id="mode-tab-menu"
                  type="button"
                  role="tab"
                  aria-selected={orderMode === "menu"}
                  aria-controls="mode-panel-menu"
                  className={`mode-tab${orderMode === "menu" ? " active" : ""}`}
                  onClick={() => switchOrderMode("menu")}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="3" width="7" height="7" rx="1.5" />
                    <rect x="14" y="3" width="7" height="7" rx="1.5" />
                    <rect x="3" y="14" width="7" height="7" rx="1.5" />
                    <rect x="14" y="14" width="7" height="7" rx="1.5" />
                  </svg>
                  <span>Build Menu</span>
                </button>
                <button
                  id="mode-tab-voice"
                  type="button"
                  role="tab"
                  aria-selected={orderMode === "voice"}
                  aria-controls="mode-panel-voice"
                  className={`mode-tab${orderMode === "voice" ? " active" : ""}`}
                  onClick={() => switchOrderMode("voice")}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" x2="12" y1="19" y2="22" />
                  </svg>
                  <span>Voice &amp; Chat</span>
                  {isListening || chatLoading || isSpeaking ? (
                    <span className="mode-live-dot" aria-hidden="true" />
                  ) : null}
                </button>
              </div>

              <div className="mode-stage">
                {orderMode === "menu" ? (
                  <div
                    id="mode-panel-menu"
                    role="tabpanel"
                    aria-labelledby="mode-tab-menu"
                    className="mode-panel"
                  >
                      {/* centred over the ingredient cards, where the user is looking when they hit the limit */}
                      {limitNoticeVisible ? (
                        <div className="limit-notice" role="alert">
                          <div>
                            <strong>That's a full sub!</strong>
                            <p>
                              {maxIngredientPortions} portions is the most one bread can hold. Remove an ingredient or
                              pick a smaller portion to add something else.
                            </p>
                          </div>
                          <button type="button" className="limit-notice-close" onClick={hideLimitNotice} aria-label="Close">
                            ×
                          </button>
                        </div>
                      ) : null}
                      <div className="builder-header">
                        <h2 className="builder-title">{titleForCategory(activeCategory)}</h2>
                      </div>

                      <ul className="builder-tabs" aria-label="Build options">
                        {builderTabs.map((option) => (
                          <li key={option}>
                            <button
                              type="button"
                              className={`tab-button${option === "Suggestion" ? " suggestion-tab" : ""}${activeCategory === option ? " active" : ""}`}
                              onClick={() => setActiveCategory(option)}
                            >
                              {option}
                            </button>
                          </li>
                        ))}
                      </ul>

                      {activeCategory === "Suggestion" ? (
                      <div className="topping-grid">
                        {subSuggestions.map((suggestion) => {
                          const isChosen = toppingOptions.every(
                            (option) => (toppingAmounts[option.name] ?? 0) === (suggestion.amounts[option.name] ?? 0)
                          )
                          return (
                            <div
                              key={suggestion.name}
                              className={`suggestion-item${isChosen ? " selected" : ""}`}
                              // clicking the card loads the combo in the current size; the size buttons pick one
                              onClick={() => applySuggestion(suggestion, sandwichSize)}
                            >
                              <SandwichThumb amounts={suggestion.amounts} />
                              <span className="suggestion-name">{suggestion.name}</span>
                              <span className="suggestion-detail">{suggestionIngredients(suggestion)}</span>
                              <span className="suggestion-price">
                                ${priceSub(suggestion.amounts, "6-inch").toFixed(2)} / ${priceSub(suggestion.amounts, "Footlong").toFixed(2)}
                              </span>
                              {/* like the bread cards: picking a size loads the combo in that size */}
                              <div className="size-picker" role="group" aria-label={`${suggestion.name} size`}>
                                {breadSizes.map((size) => {
                                  const isActiveSize = isChosen && sandwichSize === size
                                  return (
                                    <button
                                      key={size}
                                      type="button"
                                      className={`size-button${isActiveSize ? " active" : ""}`}
                                      onClick={(event) => {
                                        event.stopPropagation()
                                        applySuggestion(suggestion, size)
                                      }}
                                      aria-pressed={isActiveSize}
                                      aria-label={`${suggestion.name} ${size}`}
                                    >
                                      {size}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      ) : (
                      <div className="topping-grid">
                        {visibleToppings.map((topping) => {
                          const amount = toppingAmounts[topping.name] ?? 0
                          const isBread = topping.category === "Bread"
                          const isSelected = isBread ? previewBread?.name === topping.name : amount > 0
                          const breadDisabled = isBread && !isSelected && nonBreadIngredientCount >= maxIngredientPortions
                          return (
                            <div
                              key={topping.name}
                              className={`topping-item${isSelected ? " selected" : ""}`}
                              // clicking the card picks it with a default (bread: the current size; others: Normal,
                              // or Small if Normal won't fit); clicking a picked card removes it. The size/portion
                              // buttons choose a specific option and stop their click from reaching the card.
                              onClick={() => {
                                if (isBread) {
                                  selectBreadSize(topping.name, sandwichSize)
                                } else if (amount > 0 && !addedOnCounter) {
                                  selectToppingPortion(topping.name, amount)
                                } else {
                                  const used = addedOnCounter ? 0 : selectedIngredientCount
                                  const normalFits = sauceOptionNames.has(topping.name) || used + 2 <= maxIngredientPortions
                                  selectToppingPortion(topping.name, normalFits ? 2 : 1)
                                }
                              }}
                            >
                              <div className={`topping-swatch${topping.icon ? " cutout" : ""}${topping.category === "Sauce" ? " bowl" : ""}${topping.photoZoom ? " photo" : ""}`} style={{ "--photo-zoom": topping.photoZoom } as CSSProperties} aria-hidden="true">
                                <img src={topping.icon ?? topping.image} alt="" loading="lazy" />
                              </div>
                              {isBread ? (
                                <div className="size-picker" role="group" aria-label={`${topping.name} size`}>
                                  {breadSizes.map((size) => {
                                    const isActiveSize = isSelected && sandwichSize === size
                                    return (
                                      <button
                                        key={size}
                                        type="button"
                                        className={`size-button${isActiveSize ? " active" : ""}${breadDisabled ? " over-limit" : ""}`}
                                        onClick={(event) => {
                                          event.stopPropagation()
                                          selectBreadSize(topping.name, size)
                                        }}
                                        aria-disabled={breadDisabled}
                                        aria-pressed={isActiveSize}
                                        aria-label={`${topping.name} ${size}`}
                                      >
                                        {size}
                                      </button>
                                    )
                                  })}
                                </div>
                              ) : (
                                <div className="size-picker portion-picker" role="group" aria-label={`${topping.name} portion`}>
                                  {toppingPortionLevels.map(({ label, amount: levelAmount }) => {
                                    const isActiveLevel = amount === levelAmount
                                    // still clickable past the limit (looks disabled), so the click can explain why it did nothing
                                    const isOverLimit =
                                      !isActiveLevel &&
                                      !sauceOptionNames.has(topping.name) &&
                                      selectedIngredientCount - amount + levelAmount > maxIngredientPortions
                                    return (
                                      <button
                                        key={label}
                                        type="button"
                                        className={`size-button${isActiveLevel ? " active" : ""}${isOverLimit ? " over-limit" : ""}`}
                                        onClick={(event) => {
                                          event.stopPropagation()
                                          selectToppingPortion(topping.name, levelAmount)
                                        }}
                                        aria-disabled={isOverLimit}
                                        aria-pressed={isActiveLevel}
                                        aria-label={`${topping.name} ${label}`}
                                      >
                                        {label}
                                      </button>
                                    )
                                  })}
                                </div>
                              )}
                              <div className="name">{topping.name}</div>
                            </div>
                          )
                        })}
                      </div>
                      )}

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
                      <p className="pricing-note">{pricingNote}</p>
                  </div>
                ) : (
                  <div
                    id="mode-panel-voice"
                    role="tabpanel"
                    aria-labelledby="mode-tab-voice"
                    className="mode-panel"
                  >
                      <div className="chat-popup" aria-label="Order voice and chat assistant">
                        <div className="chat-popup-body">
                          <div
                            className={`chat-staff${chatLoading || isListening || isSpeaking ? " processing" : chatError ? " error" : ""}`}
                          >
                            <img src={staffHelper} alt="Long Story Sub staff member helping with your order" />
                            <span className="avatar-status" role="status">
                              {isListening || chatLoading || isSpeaking ? (
                                <span className="mode-live-dot" aria-hidden="true" />
                              ) : null}
                              {assistantStatus}
                            </span>
                          </div>

                          <div className="chat-conversation">
                            <p className="chat-kicker">A little help from the counter.</p>
                            <div className="chat-log" ref={chatLogRef} role="log" aria-live="polite">
                              {conversationMessages.map((message, index) =>
                                message.role === "user" ? (
                                  <div key={`user-${index}`} className="speech from-user">
                                    <p>{message.text}</p>
                                  </div>
                                ) : (
                                  <div key={`staff-${index}`} className="speech">
                                    <p>{message.text}</p>
                                    {index === lastAssistantIndex ? (
                                      <div className="tiny">
                                        {selectedNames.length > 0 ? selectedNames.join(", ") : "Pick or say ingredients to start."}
                                      </div>
                                    ) : null}
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="chat-footer">
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

                          {/* live words while the user talks; when they stop, it's sent and appears in the chat */}
                          {isListening ? (
                            <div className="heard-card" role="status">
                              <div>
                                <strong>Listening…</strong>
                                <span>{heardText || "Say your order, e.g. “wheat bread with turkey and mayo”."}</span>
                              </div>
                            </div>
                          ) : null}

                          <div className="chat-controls">
                            <div className="voice-controls" aria-label="Voice controls">
                              <button
                                type="button"
                                className={`voice-button primary${isListening ? " listening" : ""}`}
                                onClick={isListening ? stopListening : startListening}
                                disabled={!voiceSupported || chatLoading}
                                aria-pressed={isListening}
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                  <line x1="12" x2="12" y1="19" y2="22" />
                                </svg>
                                {isListening ? "Stop listening" : voiceSupported ? "Start voice order" : "Voice unavailable"}
                              </button>
                              <button
                                type="button"
                                className={`voice-button${voiceReplies ? " on" : ""}`}
                                onClick={toggleVoiceReplies}
                                disabled={!speechOutputSupported}
                                aria-pressed={voiceReplies}
                                title={voiceReplies ? "Replies are read out loud" : "Replies are shown as text only"}
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                  <path d="M11 5 6 9H2v6h4l5 4V5Z" />
                                  {voiceReplies ? (
                                    <>
                                      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
                                      <path d="M19 5a10 10 0 0 1 0 14" />
                                    </>
                                  ) : (
                                    <path d="m16 9 5 6m0-6-5 6" />
                                  )}
                                </svg>
                                Voice replies: {voiceReplies ? "On" : "Off"}
                              </button>
                            </div>
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
                                placeholder="Or type your order update..."
                                disabled={chatLoading}
                              />
                              <button type="submit" className="chat-send" disabled={chatLoading || chatInput.trim().length === 0}>
                                {chatLoading ? "Sending..." : "Send"}
                              </button>
                            </form>
                          </div>

                          <p className="chat-help">
                            Try: “Wheat bread with turkey, cheddar, lettuce, and mayo.” To edit, say “remove the turkey” or “change to chicken.”
                            {!voiceSupported ? " Voice input is unavailable in this browser; text input works normally." : ""}
                          </p>
                          <p className="privacy-note">
                            Privacy: only sandwich order details (ingredients, name, pickup time) are sent. Avoid payment or contact info.
                          </p>
                        </div>
                      </div>
                  </div>
                )}
              </div>

              <div className="order-column">
                <div className="order-summary">
                  <div>
                    <div className="summary-meta">Your {sandwichSize.toLowerCase()} {proteinSummary.toLowerCase()}</div>
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
                    disabled={addedOnCounter}
                  >
                    {addedOnCounter ? "Added to bag ✓" : editingId ? "Save sub" : "Add to bag"}
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
                          {orderSubs.map((item) => (
                            <li key={item.id} className={`cart-item${item.id === editingId ? " editing" : ""}`}>
                              <div>
                                <strong>{item.quantity} × {item.size} sub</strong>
                                <p>{item.summary}</p>
                              </div>
                              <div className="cart-actions">
                                {item.id === editingId ? (
                                  <span className="editing-tag">On the counter</span>
                                ) : (
                                  <button type="button" className="undo-button" onClick={() => editCartItem(item)}>Edit</button>
                                )}
                                <button type="button" className="cart-remove" onClick={() => removeCartItem(item.id)}>
                                  Remove
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : null}
                    {/* always visible, so ordering doesn't depend on the review being open */}
                    <div className="cart-total-row">
                      <span>Total ${cartTotal.toFixed(2)}</span>
                      <button type="button" className="checkout-button" onClick={openCheckout}>
                        Order
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      {checkoutOpen ? (
        <div
          className="checkout-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeCheckout()
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") closeCheckout()
          }}
        >
          <div className="checkout-dialog" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
            {placedOrder ? (
              <div className="checkout-success">
                {/* the circle is drawn first, then the tick */}
                <svg className="success-check" viewBox="0 0 100 100" aria-hidden="true">
                  <circle cx="50" cy="50" r="44" />
                  <path d="M30 52 L44 66 L71 36" />
                </svg>
                <h2 id="checkout-title">Order placed!</h2>
                <p className="checkout-summary">
                  {placedOrder.subCount} sub{placedOrder.subCount === 1 ? "" : "s"} · ${placedOrder.total.toFixed(2)}
                  <br />
                  {placedOrder.fulfillment === "delivery"
                    ? `Delivery to ${placedOrder.address}, ${placedOrder.time}`
                    : `Pickup at the shop, ${placedOrder.time}`}
                </p>
                {emailStatus === "needed" ? (
                  // a chat order: the assistant doesn't ask for an email address, so ask here
                  <form
                    className="email-request"
                    onSubmit={(event) => {
                      event.preventDefault()
                      emailPlacedOrder()
                    }}
                  >
                    <label className="checkout-field">
                      Want a confirmation email?
                      <input
                        className="checkout-input"
                        type="email"
                        autoComplete="email"
                        value={customerEmail}
                        onChange={(event) => setCustomerEmail(event.target.value)}
                        placeholder="you@example.com"
                      />
                    </label>
                    {emailFieldError ? <p className="checkout-error" role="alert">{emailFieldError}</p> : null}
                    <button type="submit" className="checkout-cancel">Email me a confirmation</button>
                  </form>
                ) : (
                  <p className={`email-status ${emailStatus}`} role="status">
                    {emailStatus === "sending"
                      ? `Sending a confirmation to ${placedOrder.email}…`
                      : emailStatus === "sent"
                        ? `A confirmation email is on its way to ${placedOrder.email}.`
                        : "Your order is placed, but we couldn't send the confirmation email."}
                  </p>
                )}
                <button ref={checkoutDoneRef} type="button" className="cta-button" onClick={closeCheckout}>
                  Done
                </button>
              </div>
            ) : (
              <form
                className="checkout-form"
                onSubmit={(event) => {
                  event.preventDefault()
                  placeOrder()
                }}
              >
                <h2 id="checkout-title">Checkout</h2>
                <p className="checkout-summary">
                  {cartCount} sub{cartCount === 1 ? "" : "s"} · Total ${cartTotal.toFixed(2)}
                </p>
                <div className="fulfillment-picker" role="group" aria-label="Delivery or pickup">
                  {fulfillmentOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={`fulfillment-button${fulfillment === option.id ? " active" : ""}`}
                      onClick={() => {
                        setFulfillment(option.id)
                        setCheckoutError(null)
                      }}
                      aria-pressed={fulfillment === option.id}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <label className="checkout-field">
                  Name
                  <input
                    ref={checkoutNameRef}
                    className="checkout-input"
                    autoComplete="name"
                    value={pickupName}
                    onChange={(event) => setPickupName(event.target.value)}
                    placeholder="Who's the order for?"
                  />
                </label>
                <label className="checkout-field">
                  Email
                  <input
                    className="checkout-input"
                    type="email"
                    autoComplete="email"
                    value={customerEmail}
                    onChange={(event) => setCustomerEmail(event.target.value)}
                    placeholder="We'll send your confirmation here"
                  />
                </label>
                <label className="checkout-field">
                  {fulfillment === "delivery" ? "Delivery time" : "Pickup time"}
                  <select
                    className="checkout-input"
                    value={selectedPickup}
                    onChange={(event) => setPickupTime(event.target.value)}
                  >
                    <option value="" disabled>Choose a time</option>
                    {selectedPickup && !pickupChoices.slots.includes(selectedPickup) ? (
                      <option value={selectedPickup}>{selectedPickup}</option>
                    ) : null}
                    {pickupChoices.slots.map((slot) => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                </label>
                {fulfillment === "delivery" ? (
                  <label className="checkout-field">
                    Delivery address
                    <input
                      className="checkout-input"
                      autoComplete="street-address"
                      value={deliveryAddress}
                      onChange={(event) => setDeliveryAddress(event.target.value)}
                      placeholder="Within 5 km of the shop"
                    />
                  </label>
                ) : null}
                {checkoutError ? <p className="checkout-error" role="alert">{checkoutError}</p> : null}
                <div className="checkout-actions">
                  <button type="button" className="checkout-cancel" onClick={closeCheckout}>
                    Back to my order
                  </button>
                  <button type="submit" className="cta-button">
                    Place order · ${cartTotal.toFixed(2)}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </section>
  )
}

export default OrderSection