#chat endpoints: send a message to the chatbot, reset a conversation, read the current order state
import random

from chatbot import calculate_total, generate_response
from learning_resource.response_database import BUSINESS_INFO
from models.order_session import get_session, reset_session


#the state returned with every chat response, the frontend draws the sandwich from "order"
def session_state(session_id, session):
    return {
        "session_id": session_id,
        "status": session["status"],
        "step": session["pending"],
        "order": session["order"],
        "total": calculate_total(session["order"]),
        "order_id": session["order_id"],
    }


def handle_chat(payload):
    message = payload.get("message", "")
    if not isinstance(message, str) or not message.strip():
        return 400, {"error": "\"message\" must be a non-empty string."}

    session_id, session = get_session(payload.get("session_id"))
    reply = generate_response(message, session_id)

    return 200, {"reply": reply, **session_state(session_id, session)}


def handle_reset(payload):
    session_id, _ = get_session(payload.get("session_id"))
    session = reset_session(session_id)
    reply = random.choice(BUSINESS_INFO["greeting"]["responses"])

    return 200, {"reply": reply, **session_state(session_id, session)}


def handle_session(query):
    session_id = query.get("session_id")
    if not session_id:
        return 400, {"error": "\"session_id\" query parameter is required."}

    session_id, session = get_session(session_id)
    return 200, session_state(session_id, session)
