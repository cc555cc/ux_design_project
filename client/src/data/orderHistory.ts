export const DRAFT_STORAGE_KEY = "long-story-order-draft-v1"
export const CART_STORAGE_KEY = "long-story-cart-v1"
export const ORDER_HISTORY_STORAGE_KEY = "long-story-order-history-v1"

export type SavedOrderItem = {
  id: string
  account_id?: string
  summary: string
  size: string
  quantity: number
  total: number
  toppingAmounts: Record<string, number>
}

export type SavedOrder = {
  id: string
  account_id?: string
  pickupName: string
  pickupTime: string
  items: SavedOrderItem[]
  total: number
  createdAt: string
  source: "manual" | "chat"
}

type ServerSandwich = {
  bread?: string | null
  size?: string | null
  protein?: string | null
  cheese?: string | null
  veggies?: string[] | null
  sauce?: string[] | null
}

type ServerOrderRecord = {
  id: string
  account_id?: string | null
  name?: string | null
  pickup_time?: string | null
  sandwich?: ServerSandwich | null
  total?: number
  created_at?: string
}

const KNOWN_TOPPINGS = [
  "Italian Herbs",
  "Wheat",
  "Honey Oat",
  "Turkey",
  "Roast Beef",
  "Chicken",
  "Cheddar",
  "Swiss",
  "Provolone",
  "Lettuce",
  "Tomato",
  "Cucumber",
  "Red onion",
  "Green peppers",
  "Black olives",
  "Mayo",
  "Chipotle",
  "Ranch",
]

const SERVER_TO_LOCAL_NAME_MAP: Record<string, string> = {
  "whole wheat": "Wheat",
  italian: "Italian Herbs",
  "honey oat": "Honey Oat",
}

function mapServerIngredientToLocal(value: string): string | null {
  const normalized = value.trim().toLowerCase()
  if (!normalized || normalized === "none") return null
  if (SERVER_TO_LOCAL_NAME_MAP[normalized]) return SERVER_TO_LOCAL_NAME_MAP[normalized]

  const direct = KNOWN_TOPPINGS.find((name) => name.toLowerCase() === normalized)
  if (direct) return direct

  const partial = KNOWN_TOPPINGS.find(
    (name) => normalized.includes(name.toLowerCase()) || name.toLowerCase().includes(normalized)
  )
  return partial ?? null
}

function serverOrderToSavedOrder(record: ServerOrderRecord): SavedOrder {
  const sandwich = record.sandwich ?? {}
  const toppingAmounts: Record<string, number> = Object.fromEntries(
    KNOWN_TOPPINGS.map((name) => [name, 0])
  )
  const chosenNames: string[] = []

  const rawValues: (string | null | undefined)[] = [
    sandwich.bread,
    sandwich.protein,
    sandwich.cheese,
    ...(sandwich.veggies ?? []),
    ...(sandwich.sauce ?? []),
  ]

  for (const raw of rawValues) {
    if (!raw) continue
    const localName = mapServerIngredientToLocal(raw)
    if (localName && toppingAmounts[localName] === 0) {
      toppingAmounts[localName] = 1
      chosenNames.push(localName)
    }
  }

  const size = sandwich.size || "6-inch"
  const total = typeof record.total === "number" ? record.total : 0

  return {
    id: record.id,
    ...(record.account_id ? { account_id: record.account_id } : {}),
    pickupName: record.name ?? "",
    pickupTime: record.pickup_time ?? "",
    total,
    createdAt: record.created_at ?? new Date().toISOString(),
    source: "chat",
    items: [
      {
        id: `item-${record.id}`,
        ...(record.account_id ? { account_id: record.account_id } : {}),
        summary: chosenNames.length > 0 ? chosenNames.join(", ") : "Custom sub",
        size,
        quantity: 1,
        total,
        toppingAmounts,
      },
    ],
  }
}

export function loadLocalOrderHistory(): SavedOrder[] {
  try {
    const raw = localStorage.getItem(ORDER_HISTORY_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as SavedOrder[]) : []
  } catch {
    return []
  }
}

export function saveCompletedOrder(order: SavedOrder): void {
  const existing = loadLocalOrderHistory().filter((entry) => entry.id !== order.id)
  const updated = [order, ...existing]
  localStorage.setItem(ORDER_HISTORY_STORAGE_KEY, JSON.stringify(updated))
}

export async function fetchOrdersForAccount(accountId: string): Promise<SavedOrder[]> {
  const localOrders = loadLocalOrderHistory().filter(
    (order) => order.account_id === accountId
  )

  let serverOrders: SavedOrder[] = []
  try {
    const response = await fetch(
      `/api/orders?account_id=${encodeURIComponent(accountId)}`
    )
    if (response.ok) {
      const data = (await response.json()) as { orders?: ServerOrderRecord[] }
      if (Array.isArray(data.orders)) {
        serverOrders = data.orders.map(serverOrderToSavedOrder)
      }
    }
  } catch {
    // Backend may not be running; fall back cleanly to localStorage orders.
  }

  const byId = new Map<string, SavedOrder>()
  for (const order of [...localOrders, ...serverOrders]) {
    if (!byId.has(order.id)) {
      byId.set(order.id, order)
    }
  }

  return [...byId.values()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

export function loadOrderIntoBuilder(order: SavedOrder, accountId?: string): void {
  const primaryItem = order.items[0]

  const draft = {
    ...(accountId ? { account_id: accountId } : {}),
    toppingAmounts: primaryItem ? { ...primaryItem.toppingAmounts } : {},
    sandwichSize: primaryItem?.size ?? "6-inch",
    quantity: primaryItem?.quantity ?? 1,
    chatMessages: [],
    chatSessionId: null,
    pickupName: order.pickupName,
    pickupTime: order.pickupTime,
  }

  const reorderedCartItems: SavedOrderItem[] = order.items.map((item, index) => ({
    ...item,
    id: `reorder-${Date.now()}-${index}`,
    ...(accountId ? { account_id: accountId } : {}),
    toppingAmounts: { ...item.toppingAmounts },
  }))

  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft))
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(reorderedCartItems))
  window.location.hash = "#order"
}
