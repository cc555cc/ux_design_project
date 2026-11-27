#asks Claude what the customer's message means for the chatbot: what they want to do (order, confirm, cancel, ask a
#question ...) and, for orders, what the whole sandwich should look like after the message.
#Claude only interprets the message, chatbot.py still applies the changes, checks the limits and writes the replies.
import json

import anthropic

from learning_resource.response_database import MENU_ITEMS

MODEL = "claude-haiku-5-5"
NOT_CHOSEN = "not_chosen"
ACTIONS = ["order", "confirm", "reject", "cancel", "question", "greeting", "unknown"]
TOPICS = ["none", "hours", "address", "contact", "menu", "delivery"]


def menu_names(category):
    return [item["name"] for item in MENU_ITEMS[category]]


#the reply has to match this schema exactly, so every ingredient Claude names is a real menu item
RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "action": {"type": "string", "enum": ACTIONS},
        "topic": {"type": "string", "enum": TOPICS},
        "bread": {"type": "string", "enum": menu_names("bread") + [NOT_CHOSEN]},
        "size": {"type": "string", "enum": menu_names("size") + [NOT_CHOSEN]},
        "protein": {"type": "string", "enum": menu_names("protein") + ["none", NOT_CHOSEN]},
        "cheese": {"type": "string", "enum": menu_names("cheese") + ["none", NOT_CHOSEN]},
        "veggies_chosen": {"type": "boolean"},
        "veggies": {"type": "array", "items": {"type": "string", "enum": menu_names("veggies")}},
        "sauce_chosen": {"type": "boolean"},
        "sauce": {"type": "array", "items": {"type": "string", "enum": menu_names("sauce")}},
        "name": {"type": "string"},
        "pickup_time": {"type": "string"},
        "not_on_menu": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "category": {"type": "string", "enum": ["bread", "protein", "cheese", "veggies", "sauce"]},
                    "item": {"type": "string"},
                },
                "required": ["category", "item"],
                "additionalProperties": False,
            },
        },
    },
    "required": [
        "action", "topic", "bread", "size", "protein", "cheese", "veggies_chosen", "veggies",
        "sauce_chosen", "sauce", "name", "pickup_time", "not_on_menu",
    ],
    "additionalProperties": False,
}

MENU_TEXT = "\n".join(f"- {category}: {', '.join(menu_names(category))}" for category in MENU_ITEMS)

SYSTEM_PROMPT = f"""You read messages sent to the ordering chat of Long Story Sub, a sandwich shop. A sub has one bread, one size,
one meat (protein), one cheese, any number of veggies and sauces, plus the customer's name and a pickup time.

Menu:
{MENU_TEXT}

You get the current order and the customer's latest message. Reply with:

action:
- order: starts an order or changes it in any way, including answering the assistant's last question
  (an ingredient, "no", "none", "all of them", a name, a time)
- confirm: says yes to placing the order while the assistant is showing the order review
- reject: does not want to place it yet / wants to change something, but does not say what
- cancel: wants to cancel the order or start over from scratch
- question: only asks a question and changes nothing
- greeting: hello, thanks, small talk
- unknown: anything else

topic: what the customer asks about, if anything (hours, address, contact = phone or email, menu = ingredients or
prices, delivery), also when the same message changes the order. Otherwise none.

The order fields: the WHOLE order as it should be after this message. Copy every field the message does not change.
- bread, size: a menu name, or not_chosen
- protein, cheese: a menu name, none when the customer does not want any, or not_chosen
- veggies, sauce: the full list after the message. veggies_chosen / sauce_chosen is true once the customer has
  answered, including "no veggies" (true with an empty list); false when not answered yet
- "all veggies" or "everything" for veggies means every veggie on the menu
- "remove all" / "remove everything" / "clear it" without naming a category empties the sandwich: bread, size,
  protein and cheese not_chosen, veggies_chosen and sauce_chosen false, empty lists. Keep the name and pickup time.
- "remove all veggies" means veggies_chosen true with an empty list; the same for the other categories
- "swap swiss for cheddar" means cheese Cheddar
- name: the name for the order, "" if not given
- pickup_time: like "12:30pm", "1pm" or "ASAP"; "unclear" when vague ("tonight", "later"); "" if not given
- not_on_menu: things the customer asked for that are not on the menu, with their category. Do not put them in
  the order fields, and keep what is already in that category.

For actions other than order, return the current order unchanged."""

_client = None


def _get_client():
    global _client
    if _client is None:
        _client = anthropic.Anthropic()  #reads ANTHROPIC_API_KEY from the environment
    return _client


def describe_session(session, order):
    if session["status"] == "confirming":
        state = "The assistant is showing the order review and asked whether to place the order."
    elif session["status"] == "building" and session["pending"]:
        state = f"An order is in progress. The assistant just asked the customer for: {session['pending']}."
    else:
        state = "No order is in progress."

    return f"{state}\nCurrent order: {json.dumps(order)}"


#returns Claude's interpretation as a dict, or None when Claude did not give a usable answer.
#order is the order Claude should start from (an empty order when no order is in progress)
def interpret_message(phrase, session, order):
    response = _get_client().messages.create(
        model=MODEL,
        max_tokens=2048,
        output_config={
            "effort": "medium",
            "format": {"type": "json_schema", "schema": RESPONSE_SCHEMA},
        },
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": f"{describe_session(session, order)}\nCustomer message: {phrase}"}],
    )

    #refusal or cut off: let the caller fall back to the keyword rules
    if response.stop_reason != "end_turn":
        return None

    text = next(block.text for block in response.content if block.type == "text")
    return json.loads(text)
