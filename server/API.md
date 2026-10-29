# Sandwich Ordering API

Base URL: `http://127.0.0.1:8000`. Every response is JSON. CORS is open (`*`), so the frontend can call the API directly or through a Vite proxy (`'/api': 'http://127.0.0.1:8000'`).

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/chat` | Send a user message (typed or speech-to-text) and get the bot reply plus the current order state |
| POST | `/api/chat/reset` | Start a fresh conversation for a session |
| GET | `/api/session?session_id=…` | Read the current order state without sending a message |
| GET | `/api/menu` | Ingredient catalog grouped by build step |
| GET | `/api/orders` | Confirmed orders, newest first |

## Session state

Every chat endpoint returns the same state object. The frontend should redraw the sandwich from `order` after every response.

```json
{
  "session_id": "3f2a…",
  "status": "building",
  "step": "cheese",
  "order": {
    "bread": "Whole Wheat",
    "size": "Footlong",
    "protein": "Turkey",
    "cheese": null,
    "veggies": ["Lettuce", "Tomato"],
    "sauce": null,
    "name": null,
    "pickup_time": null
  },
  "total": 10.99,
  "order_id": null
}
```

| Field | Meaning |
|---|---|
| `session_id` | Identifies the conversation. Send it back with every request. If you omit it, the server creates one and returns it. Sessions are kept in memory and are lost when the server restarts. |
| `status` | `idle` (no order yet), `building` (collecting details), `confirming` (review shown, waiting for "yes" or a change), `complete` (order saved) |
| `step` | The detail the bot is currently asking for: `bread`, `size`, `protein`, `cheese`, `veggies`, `sauce`, `name`, `pickup_time`, or `null` |
| `order` | The sandwich so far (see below) |
| `total` | Price of the selected ingredients, in dollars |
| `order_id` | Set after the order is confirmed and saved |

`order` values:

- `null`: not answered yet. Don't draw this layer.
- `bread`, `size`, `protein`, `cheese`: a single item name from `/api/menu`. `protein` and `cheese` can also be `"none"` when the user said "no meat" / "no cheese".
- `veggies`, `sauce`: a list of item names. `[]` means the user chose none.
- `pickup_time`: the time as the user said it, e.g. `"12:30"`, `"1pm"`, `"noon"`, or `"ASAP"`.

## POST `/api/chat`

Request:

```json
{ "message": "footlong italian with turkey and swiss", "session_id": "3f2a…" }
```

Response `200`: `{ "reply": "<bot text>", ...session state }`

```json
{
  "reply": "Got it: Footlong, Italian, Turkey, Swiss. Which veggies would you like? …",
  "session_id": "3f2a…",
  "status": "building",
  "step": "veggies",
  "order": { "bread": "Italian", "size": "Footlong", "protein": "Turkey", "cheese": "Swiss", "veggies": null, "sauce": null, "name": null, "pickup_time": null },
  "total": 10.99,
  "order_id": null
}
```

`reply` is plain text and may contain `\n` line breaks (the order review and the ingredient list are multi-line). It can be passed straight to `speechSynthesis` for the spoken reply.

Errors: `400` if the body is not a JSON object or `message` is empty: `{ "error": "…" }`.

### What the user can say

| Situation | Examples | Effect |
|---|---|---|
| Start an order | "I want to order a sub", "can I get a sandwich" | `status` → `building`, bot asks for bread |
| Everything at once | "footlong italian with turkey, swiss, lettuce, tomato and mayo for pickup at 12:30 under Carson" | All fields recorded in one go. If all are filled, it jumps straight to the review. |
| Step by step | "whole wheat" → "footlong" → "chicken" → … | Bot asks for the next missing step in the order bread → size → meat → cheese → veggies → sauce → name → pickup time |
| Out of order | "my name is Carson" while being asked about cheese | Detail recorded, bot repeats the current question |
| Skip an optional step | "no cheese", "no veggies", "no thanks", "none" | Field set to `"none"` / `[]` |
| All veggies | "all veggies", "everything except onions", "with everything" | All veggies, minus any excluded ones |
| Swap | "swap swiss for cheddar", "replace turkey with ham", "ham instead of turkey", "change the bread to wheat" | Old item removed, new item set |
| Remove | "no onions", "hold the pickles", "remove the turkey" | Item removed. Removing the only meat, cheese, bread or size makes the bot ask that step again. |
| Side question | "what are your hours", "show me the menu", "what's your phone number" | Answered, then the pending question is repeated. The order is kept. |
| Confirm | "yes", "sounds good", "place it" (while `status` is `confirming`) | Order saved, `status` → `complete`, `order_id` set |
| Reject | "no", "wait" (while `confirming`) | Bot asks what to change |
| Cancel | "cancel", "start over" | `status` → `idle` |

Unknown items ("brioche") get a "Sorry, I didn't catch that" plus the list of available options for the current step.

## POST `/api/chat/reset`

Request: `{ "session_id": "3f2a…" }` (optional; a new session is created without it).
Response `200`: `{ "reply": "<greeting>", ...empty session state }`. Use it for a "New order" button or on page load to get the welcome message.

## GET `/api/session?session_id=3f2a…`

Response `200`: the session state, no `reply`. Useful to restore the sandwich after a page refresh.
Errors: `400` if `session_id` is missing.

## GET `/api/menu`

Response `200`:

```json
{
  "steps": ["bread", "size", "protein", "cheese", "veggies", "sauce", "name", "pickup_time"],
  "categories": {
    "bread":   [{ "name": "Italian", "price": 0 }, { "name": "Honey Oat", "price": 0.5 }, …],
    "size":    [{ "name": "6-inch", "price": 6.99 }, { "name": "Footlong", "price": 10.99 }],
    "protein": […], "cheese": […], "veggies": […], "sauce": […]
  }
}
```

Item `name`s are exactly the strings used in `order`, so they can key the layer images (e.g. `public/images/ingredients/<name>.png`). The size price is the base price, and the other prices are add-ons.

## GET `/api/orders`

Response `200`:

```json
{
  "orders": [
    {
      "id": "7a94669a",
      "name": "Carson",
      "pickup_time": "1:15pm",
      "sandwich": { "bread": "Whole Wheat", "size": "Footlong", "protein": "Turkey", "cheese": "none", "veggies": ["Lettuce"], "sauce": ["Mayo"] },
      "total": 10.99,
      "created_at": "2026-10-29T04:41:36"
    }
  ]
}
```

## Errors

Unknown routes return `404 { "error": "No route for GET /api/…" }`. Unexpected failures return `500 { "error": "Server error: …" }`.
