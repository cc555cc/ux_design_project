#orders endpoints: list the orders confirmed through the chatbot (newest first),
#and email the customer a confirmation after checking out on the order page
import re
import smtplib
import threading
import time

from db.order_store import load_orders
from mailer import MailNotConfigured, check_configured, send_confirmation

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
SIZES = {"6-inch", "Footlong"}

#the address is whatever the customer typed, so limit how often mail can be sent (kept in memory, reset on restart)
PER_ADDRESS_LIMIT = 3          #emails to one address...
PER_ADDRESS_WINDOW = 10 * 60   #...per 10 minutes
GLOBAL_LIMIT = 60              #emails in total...
GLOBAL_WINDOW = 60 * 60        #...per hour
_sent_log = []                 #(timestamp, address)
_sent_lock = threading.Lock()


def handle_list_orders(query):
    orders = load_orders()
    account_id = query.get("account_id")
    if account_id:
        orders = [order for order in orders if order.get("account_id") == account_id]
    orders.reverse()
    return 200, {"orders": orders}


def _text(value, limit, required=True):
    """a trimmed string no longer than limit, or None if it's missing/invalid"""
    if not isinstance(value, str):
        return None
    value = value.strip()
    if (required and not value) or len(value) > limit:
        return None
    return value


def _number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and value >= 0


def validate_confirmation(payload):
    """-> (order dict, None) or (None, error message)"""
    email = _text(payload.get("email"), 254)
    if not email or not EMAIL_PATTERN.match(email):
        return None, "Please provide a valid email address."
    name = _text(payload.get("name"), 80)
    if not name:
        return None, "Please provide a name for the order."
    fulfillment = payload.get("fulfillment")
    if fulfillment not in ("delivery", "pickup"):
        return None, "fulfillment must be 'delivery' or 'pickup'."
    address = _text(payload.get("address"), 200, required=fulfillment == "delivery")
    if fulfillment == "delivery" and not address:
        return None, "Please provide a delivery address."
    order_time = _text(payload.get("time"), 40)
    order_id = _text(payload.get("order_id"), 60)
    if not order_time or not order_id:
        return None, "time and order_id are required."
    if not _number(payload.get("total")):
        return None, "total must be a number."

    raw_items = payload.get("items")
    if not isinstance(raw_items, list) or not 1 <= len(raw_items) <= 20:
        return None, "items must list between 1 and 20 subs."
    items = []
    for raw in raw_items:
        if not isinstance(raw, dict):
            return None, "Each item must be an object."
        quantity = raw.get("quantity")
        summary = _text(raw.get("summary"), 300)
        if (
            not isinstance(quantity, int) or isinstance(quantity, bool) or not 1 <= quantity <= 50
            or raw.get("size") not in SIZES or not summary or not _number(raw.get("total"))
        ):
            return None, "Each item needs a quantity, size, summary and total."
        items.append({"quantity": quantity, "size": raw["size"], "summary": summary, "total": float(raw["total"])})

    return {
        "email": email,
        "name": name,
        "fulfillment": fulfillment,
        "address": address or "",
        "time": order_time,
        "order_id": order_id,
        "total": float(payload["total"]),
        "items": items,
    }, None


def _reserve_send(address):
    """records a send if it's within the limits; False when the address or the server has sent too many"""
    now = time.time()
    address = address.lower()
    with _sent_lock:
        _sent_log[:] = [(sent, to) for sent, to in _sent_log if now - sent < GLOBAL_WINDOW]
        to_address = [sent for sent, to in _sent_log if to == address and now - sent < PER_ADDRESS_WINDOW]
        if len(to_address) >= PER_ADDRESS_LIMIT or len(_sent_log) >= GLOBAL_LIMIT:
            return False
        _sent_log.append((now, address))
        return True


def handle_confirmation_email(payload):
    order, error = validate_confirmation(payload)
    if error:
        return 400, {"error": error}
    try:
        check_configured()  #checked first, so an unconfigured server doesn't use up the send limit
    except MailNotConfigured as not_configured:
        return 503, {"error": str(not_configured)}
    if not _reserve_send(order["email"]):
        return 429, {"error": "Too many confirmation emails were sent recently. Please try again later."}
    try:
        send_confirmation(order)
    except MailNotConfigured as not_configured:
        return 503, {"error": str(not_configured)}
    except (smtplib.SMTPException, OSError):
        return 502, {"error": "The confirmation email could not be sent."}
    return 200, {"sent": True}
