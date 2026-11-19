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

const defaultSelections = ["Turkey", "Lettuce", "Tomato", "Cucumber", "Mayo"]
const basePrice = 9.5
const extraIngredientPrice = 0.45

type ChatRole = "user" | "assistant"

type ChatMessage = {
  role: ChatRole
  text: string
}

type ChatbotOrderState = {
  bread: string | null
  protein: string | null
  cheese: string | null
  veggies: string[] | null
  sauce: string[] | null
}

type ChatbotResponse = {
  reply?: string
  session_id: string
  step: string | null
  total: number
  order: ChatbotOrderState
  error?: string
}

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
  const [activeCategory, setActiveCategory] = useState<ProductOption>("Veggies")
  const [selectedToppings, setSelectedToppings] = useState<string[]>(defaultSelections)
  const [quantity, setQuantity] = useState(1)
  const [addedCount, setAddedCount] = useState(0)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState("")
  const [chatSessionId, setChatSessionId] = useState<string | null>(null)
  const [chatLoading, setChatLoading] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)
  const [chatTotal, setChatTotal] = useState<number | null>(null)
  const initRef = useRef(false)

  const visibleToppings = useMemo(
    () => toppingOptions.filter((option) => option.category === activeCategory),
    [activeCategory]
  )

  const selectedNames = useMemo(
    () => toppingOptions.filter((option) => selectedToppings.includes(option.name)).map((option) => option.name),
    [selectedToppings]
  )

  const selectedOptions = useMemo(
    () => toppingOptions.filter((option) => selectedToppings.includes(option.name)),
    [selectedToppings]
  )

  const previewLayers = useMemo(() => {
    const categoryOrder: ProductOption[] = ["Sauce", "Cheese", "Protein", "Veggies"]
    return categoryOrder
      .flatMap((category) => selectedOptions.filter((option) => option.category === category))
      .slice(0, 8)
  }, [selectedOptions])

  const breadPreviewImage = useMemo(
    () =>
      selectedOptions.find((option) => option.category === "Bread")?.image ??
      toppingOptions.find((option) => option.name === "Wheat")?.image ??
      "/toppings/wheat.jpg",
    [selectedOptions]
  )

  const totalPrice = useMemo(() => {
    const extras = Math.max(0, selectedToppings.length - defaultSelections.length)
    const singleSub = basePrice + extras * extraIngredientPrice
    return singleSub * quantity
  }, [quantity, selectedToppings])
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

  function applyChatState(response: ChatbotResponse) {
    setChatSessionId(response.session_id)
    setChatTotal(typeof response.total === "number" ? response.total : null)

    if (response.order) {
      const mappedSelections = selectedToppingsFromServerOrder(response.order)
      if (mappedSelections.length > 0) {
        setSelectedToppings(mappedSelections)
      }
    }

    if (response.step && stepToCategoryMap[response.step]) {
      setActiveCategory(stepToCategoryMap[response.step])
    }
  }

  async function resetChatSession() {
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

  async function sendChatMessage(overrideMessage?: string) {
    const message = (overrideMessage ?? chatInput).trim()
    if (!message || chatLoading) return

    setChatMessages((current) => [...current, { role: "user", text: message }])
    setChatInput("")
    setChatLoading(true)
    setChatError(null)

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
    } finally {
      setChatLoading(false)
    }
  }

  function toggleTopping(name: string) {
    setSelectedToppings((current) =>
      current.includes(name) ? current.filter((item) => item !== name) : [...current, name]
    )
    setChatTotal(null)
  }

  useEffect(() => {
    if (initRef.current) return
    initRef.current = true
    void resetChatSession()
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
        .product-panel h2 { margin: 4px 0 0; font-size: clamp(1.8rem, 3vw, 2.6rem); line-height: 1.05; letter-spacing: -0.06em; font-weight: 700; color: #2e2b2a; }
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
        .topping-item { background: rgba(255,255,255,0.32); border: 1px solid rgba(95,79,69,0.1); border-radius: 12px; padding: 10px 8px 8px; text-align: center; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 8px; min-height: 118px; cursor: pointer; }
        .topping-item.selected { border-color: rgba(35, 32, 30, 0.25); box-shadow: 0 0 0 2px rgba(35, 32, 30, 0.08); }
        .topping-swatch { width: 42px; height: 42px; border-radius: 12px; border: 1px solid rgba(44, 37, 34, 0.08); overflow: hidden; background: #f2ece7; }
        .topping-swatch img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .topping-item .name { font-size: 0.66rem; color: #4e4a48; font-weight: 600; }
        .topping-item .badge { width: 20px; height: 20px; border-radius: 50%; display: grid; place-items: center; font-size: 0.7rem; background: white; border: 1px solid rgba(0,0,0,0.08); color: #4d4c4d; }

        .builder-summary { margin-top: 16px; padding-top: 14px; border-top: 1px solid rgba(0,0,0,0.08); display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: 0.7rem; color: #625d5b; }
        .summary-pill { display: inline-flex; align-items: center; gap: 7px; padding: 4px 8px; border: 1px solid rgba(80,72,69,0.1); border-radius: 999px; background: rgba(255,255,255,0.2); }
        .summary-pill strong { color: #272323; }

        .bottom-bar { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 18px; margin-top: 12px; align-items: end; }
        .chat-panel { background: rgba(255,255,255,0.35); border: 1px solid rgba(85,75,70,0.1); border-radius: 16px; padding: 12px; min-height: 215px; display: flex; flex-direction: column; gap: 10px; }
        .chat-top { display: flex; justify-content: space-between; gap: 12px; align-items: flex-end; }
        .chat-kicker { margin: 0 0 6px; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #5f5651; }
        .speech { position: relative; background: rgba(255,255,255,0.3); border: 2px solid #171414; border-radius: 18px 18px 18px 0; padding: 12px 18px 10px; max-width: 300px; box-shadow: 0 8px 18px rgba(30, 23, 17, 0.08); }
        .speech::before { content: ""; position: absolute; left: -11px; bottom: 12px; width: 18px; height: 18px; border-left: 2px solid #171414; border-bottom: 2px solid #171414; background: rgba(255,255,255,0.3); transform: rotate(35deg); border-radius: 0 0 0 8px; }
        .speech p { margin: 0; font-size: 0.9rem; line-height: 1.4; color: #443f3d; }
        .speech .tiny { font-size: 0.7rem; opacity: 0.85; margin-top: 8px; color: #5c544f; }
        .chat-side { display: flex; align-items: flex-end; }
        .chat-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: linear-gradient(180deg, #f0d9c2, #d2a174);
          position: relative;
          box-shadow: inset 0 -8px 0 rgba(0,0,0,0.06);
        }
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
        .chat-form { display: flex; gap: 8px; }
        .chat-input { flex: 1; border: 1px solid rgba(0,0,0,0.15); border-radius: 999px; padding: 8px 12px; font-size: 0.75rem; background: rgba(255,255,255,0.9); }
        .chat-send { border: 0; border-radius: 999px; background: #23201f; color: #fff; font-size: 0.7rem; font-weight: 700; padding: 8px 12px; cursor: pointer; }
        .chat-send:disabled { opacity: 0.55; cursor: not-allowed; }

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
        }
      `}</style>

      <div className="order-shell">
        <div className="order-card">
          <div className="layout">
            <div className="product-panel">
              <div className="panel-label">
                <span>Your sub order</span>
                <span className="mini-pill">Fresh made</span>
              </div>
              <h2>Made just for you.</h2>

              <div className="image-stage" aria-label="Live sandwich preview">
                <div className="sandwich-build">
                  <div className="bun bun-top" style={{ backgroundImage: `url(${breadPreviewImage})` }} />
                  <div className="ingredient-stack">
                    {previewLayers.length === 0 ? (
                      <div className="ingredient-placeholder">Select toppings to build your sandwich</div>
                    ) : (
                      previewLayers.map((item) => (
                        <div
                          key={`preview-${item.name}`}
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
                  <div className="bun bun-bottom" style={{ backgroundImage: `url(${breadPreviewImage})` }} />
                </div>
                <div className="preview-meta">{previewLayers.length} ingredient layer{previewLayers.length === 1 ? "" : "s"} selected</div>
              </div>
            </div>

            <div className="builder-panel">
              <div className="builder-header">
                <h3 className="builder-title">{titleForCategory(activeCategory)}</h3>
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
                  const isSelected = selectedToppings.includes(topping.name)
                  return (
                    <button
                      key={topping.name}
                      type="button"
                      className={`topping-item${isSelected ? " selected" : ""}`}
                      onClick={() => toggleTopping(topping.name)}
                    >
                      <div className="topping-swatch" aria-hidden="true">
                        <img src={topping.image} alt="" loading="lazy" />
                      </div>
                      <div className="badge" aria-hidden="true">
                        {isSelected ? "✓" : "+"}
                      </div>
                      <div className="name">{topping.name}</div>
                    </button>
                  )
                })}
              </div>

              <div className="builder-summary">
                <span>{selectedNames.slice(0, 3).join(" · ") || "No ingredients selected"}</span>
                <span className="summary-pill">
                  <strong>{selectedToppings.length}</strong> selected
                </span>
              </div>
            </div>
          </div>

          <div className="bottom-bar">
            <div className="chat-panel" aria-label="Order chatbot">
              <div className="chat-top">
                <div>
                  <p className="chat-kicker">A little help from the counter.</p>
                  <div className="speech">
                    <p>{lastAssistantMessage}</p>
                    <div className="tiny">{selectedNames.length > 0 ? selectedNames.join(", ") : "Pick ingredients to start."}</div>
                  </div>
                </div>
                <div className="chat-side">
                  <div className="chat-avatar" aria-hidden="true" />
                </div>
              </div>

              {chatError ? <div className="chat-error">{chatError}</div> : null}

              <form
                className="chat-form"
                onSubmit={(event) => {
                  event.preventDefault()
                  void sendChatMessage()
                }}
              >
                <input
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
                  onClick={() => setAddedCount((count) => count + quantity)}
                >
                  Add to bag
                </button>
              </div>
              <div className="confirmation">{confirmationText}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default OrderSection