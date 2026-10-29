# Chatbot Changes: Restaurant Booking → Sandwich Ordering

This file records how `server/src` differs from the original `rule_based_chatbot` project. Add an entry here whenever the chatbot logic changes again.

## Major logic changes

### 1. The chatbot now remembers the conversation (sessions)
**Before:** each message was handled on its own. A reservation or delivery had to be stated in a single sentence; if anything was missing, the bot replied with a generic "please provide your name, party size…" message.
**Now:** `models/order_session.py` keeps one order per `session_id` in memory. `generate_response(phrase, session_id)` takes the session id, and each message adds to the order already collected. This is what allows step-by-step ordering. Sessions are lost on server restart.

### 2. New routing in `generate_response()`
While an order is in progress (`status` is `building` or `confirming`):
- if the message is a side question (operation, contact, menu) **and** contains no order details, the bot answers it and repeats the pending question;
- otherwise the message goes straight to the order flow (`continue_order()`), **skipping intent detection and the learning layer**.

When no order is in progress, the original flow is used unchanged: `get_intent()` → `get_response()` → learned-word fallback.

### 3. `reservation` and `delivery` sub-intents replaced by `order`
- `INTENT_KEYWORDS["service"]` now has `order` and `menu`. The reservation keywords were removed, and the delivery/pickup keywords moved to `order`.
- `has_reservation_signals()` → `has_order_signals()`: a message is treated as an order if it names any ingredient or size from the catalog.
- **Change to `get_intent()`:** order signals used to be checked only when no top intent was found. They now override any non-`service` intent too (e.g. greeting, or "tomorrow"/"time" which are `operation` keywords). So "hi, footlong turkey for tomorrow" starts an order instead of returning the opening hours.

### 4. Order flow (new): one-step or step-by-step
- `extract_order_items()` (rewritten from `extract_delivery_order()`) matches the message against the ingredient catalog, longest alias first, comparing raw and lemmatized words.
- `apply_order_details()` records **every** detail found in the message, whatever step is pending. If the user states the whole sandwich in one sentence, everything is recorded and the bot goes straight to the review.
- Otherwise the bot asks for the first missing field, in the order **bread → size → meat → cheese → veggies → sauce → name → pickup time** (`ORDER_STEPS`).
- Meat, cheese, veggies and sauce can be skipped ("no cheese", or "no"/"none" to the current question). Bread and size are required.
- Changes mid-order: negation ("no onions", "hold the pickles"), swaps ("swap swiss for cheddar", "ham instead of turkey"), "all veggies" / "everything except onions". Bread, size, meat and cheese hold one item each, and a new mention overwrites the old one. Veggies and sauce are lists.
- When every field is filled, the bot shows a review (`build_order_review()`) with the total. "yes" saves the order (`place_order()` → `db/order_store.save_order()`), "no" asks what to change, and any detected change updates the order and shows the review again. "cancel" / "start over" drops the order at any point.

### 5. Removed functions
Removed because they only applied to reservations or deliveries: `extract_party_size`, `extract_date`, `is_date_value`, `get_next_weekday_date`, `extract_reserve_detail`, `extract_delivery_name`, `extract_delivery_address`, `extract_delivery_phone`, `extract_delivery_time`, `extract_delivery_detail`, plus the `MONTH_NAMES` constant.

### 6. Server
- `server.py` → `app.py`. It now extends `BaseHTTPRequestHandler` instead of `SimpleHTTPRequestHandler`, so it no longer serves arbitrary files from the working directory on GET.
- New endpoints: `/api/chat/reset`, `/api/session`, `/api/menu`, `/api/orders` (see `API.md`).
- `/api/chat` takes a `session_id` and returns the order state next to `reply`. Bad input returns `400` (it used to return `200` with "Server error" as the reply).

## Minor changes

- `extract_name()`: also skips "is" ("my name is Carson"). Names are additionally checked against `NON_NAME_WORDS` (ingredients, keywords, stop words) so that "for pickup" or "for lunch" is not saved as a name. When the bot has just asked for the name, a plain reply ("Carson") is accepted.
- `extract_time()`: "1 pm" now returns `1pm` (the am/pm part used to be dropped), and "asap"/"soon"/"immediately" return `ASAP`. Vague times ("afternoon", "later") make the bot ask for a specific time. `by` and `around` work like `at`.
- `is_time_value()`: accepts "12:30 pm".
- Menu reply is now a text list of ingredients. The `resource/menu.png` image reply was dropped.
- `RESERVATION_FIELD_KEYWORDS` → `ORDER_FIELD_KEYWORDS` (name and time only). New `ORDER_KEYWORDS` (category, negation, swap, confirm, cancel words). `MENU_ITEMS` is now the ingredient catalog, with aliases.
- `BUSINESS_INFO` text and `build_guess_message()` reworded for a sub shop. **Hours, address, phone and email are still placeholders.**
- `booking_store.py` → `db/order_store.py` (`save_order`, `load_orders`), saving to `db/data/orders.jsonl`.

## Unchanged

- `top_level_intent()`, `second_level_intent()`, `parse_phrase()`, `format_guessed_response()`, the structure of `get_response()`.
- `text_normalization.py`.
- `learning_resource/model_learning.py` (learning, promotion at 5 observations / 70%, intent guessing). The learning files start empty: the old `learned_interactions.jsonl` and `training_sentences.txt` were restaurant-specific and were not copied.
- `response_database_minimal.py` is still the restore baseline. It is now a copy of the new sandwich database.

## Known limitations

- Only one sandwich per order.
- Names are a single word when given with a keyword ("under Carson Chan" → "Carson").
- Lists only grow when items are added. "Just lettuce" after choosing several veggies does not remove the others, so the user has to say "no tomato" etc.
- Negation applies to the next item only ("no onions and pickles" removes onions and adds pickles). "no onions or pickles" removes both.
