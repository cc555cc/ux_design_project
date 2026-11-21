#this script keeps the in-progress sandwich order of every chat session in memory, so the chatbot can remember
#what the user already said and only ask for the details that are still missing.
#a session is identified by the session_id sent by the frontend, sessions are lost when the server restarts.
import threading
import time
import uuid


#the order in which the chatbot asks for missing details when the user orders step by step
ORDER_STEPS = ["bread", "size", "protein", "cheese", "veggies", "sauce", "name", "pickup_time"]
#fields that can hold more than one ingredient
LIST_FIELDS = {"veggies", "sauce"}
#fields the user is allowed to skip ("no cheese"), single fields are set to NO_SELECTION, list fields to []
OPTIONAL_FIELDS = {"protein", "cheese", "veggies", "sauce"}
NO_SELECTION = "none"

#idle: no order yet, building: collecting details, confirming: waiting for the user to confirm the review,
#complete: order saved
ACTIVE_STATUSES = {"building", "confirming"}

_sessions = {}
_lock = threading.Lock()
SESSION_TTL_SECONDS = 30 * 60


def new_order():
    return {step: None for step in ORDER_STEPS}


def new_session():
    return {
        "status": "idle",
        "pending": None,
        "order": new_order(),
        "order_id": None,
        "account_id": None,
        "last_accessed": time.monotonic(),
    }


#return the session for the given id, create one if it does not exist yet
def get_session(session_id=None):
    with _lock:
        cutoff = time.monotonic() - SESSION_TTL_SECONDS
        expired = [
            stored_id
            for stored_id, stored_session in _sessions.items()
            if stored_session.get("last_accessed", cutoff) < cutoff
        ]
        for stored_id in expired:
            del _sessions[stored_id]

        if not session_id:
            session_id = uuid.uuid4().hex

        if session_id not in _sessions:
            _sessions[session_id] = new_session()

        _sessions[session_id]["last_accessed"] = time.monotonic()
        return session_id, _sessions[session_id]


def reset_session(session_id):
    with _lock:
        _sessions[session_id] = new_session()
        return _sessions[session_id]


#start a fresh order inside an existing session, keeping the same session object
def start_new_order(session):
    account_id = session.get("account_id")
    session.update(new_session())
    session["account_id"] = account_id
    session["status"] = "building"


#return the first step that has not been answered yet, None when the order is complete
def next_missing_step(order):
    for step in ORDER_STEPS:
        if order[step] is None:
            return step

    return None
