#password reset by email code. accounts live in the browser (client/src/hook/useAuth.ts), so the server never sees
#passwords: it only emails a one-time code and later confirms whether the code typed in is right. the browser then
#saves the new password. codes are kept in memory (lost on restart), hashed, expire, and allow a few tries only.
import hashlib
import hmac
import secrets
import smtplib
import threading
import time

from mailer import MailNotConfigured, check_configured, send_reset_code
from routes.orders import EMAIL_PATTERN, _text

CODE_MINUTES = 10
MAX_ATTEMPTS = 5               #wrong guesses before the code is thrown away
PER_ADDRESS_LIMIT = 3          #codes sent to one address...
PER_ADDRESS_WINDOW = 15 * 60   #...per 15 minutes
GLOBAL_LIMIT = 60              #codes sent in total...
GLOBAL_WINDOW = 60 * 60        #...per hour

_codes = {}        #email -> {"hash", "expires", "attempts"}
_sent_log = []     #(timestamp, email)
_lock = threading.Lock()


def _hash(code):
    return hashlib.sha256(code.encode("utf-8")).hexdigest()


def _email(payload):
    email = _text(payload.get("email"), 254)
    if not email or not EMAIL_PATTERN.match(email):
        return None
    return email.lower()


def _reserve_send(email, now):
    _sent_log[:] = [(sent, to) for sent, to in _sent_log if now - sent < GLOBAL_WINDOW]
    recent = [sent for sent, to in _sent_log if to == email and now - sent < PER_ADDRESS_WINDOW]
    if len(recent) >= PER_ADDRESS_LIMIT or len(_sent_log) >= GLOBAL_LIMIT:
        return False
    _sent_log.append((now, email))
    return True


def handle_reset_code(payload):
    email = _email(payload)
    if not email:
        return 400, {"error": "Please provide a valid email address."}
    try:
        check_configured()
    except MailNotConfigured as not_configured:
        return 503, {"error": str(not_configured)}

    code = f"{secrets.randbelow(1_000_000):06d}"
    now = time.time()
    with _lock:
        if not _reserve_send(email, now):
            return 429, {"error": "Too many codes were sent recently. Please wait a few minutes and try again."}
        #a new code replaces any earlier one
        _codes[email] = {"hash": _hash(code), "expires": now + CODE_MINUTES * 60, "attempts": 0}

    try:
        send_reset_code(email, code, CODE_MINUTES)
    except MailNotConfigured as not_configured:
        return 503, {"error": str(not_configured)}
    except (smtplib.SMTPException, OSError):
        with _lock:
            _codes.pop(email, None)
        return 502, {"error": "The reset code could not be sent."}
    return 200, {"sent": True, "expires_in_minutes": CODE_MINUTES}


def handle_verify_reset(payload):
    email = _email(payload)
    code = payload.get("code")
    if not email or not isinstance(code, str):
        return 400, {"error": "Please provide your email and the code."}
    code = code.strip()

    with _lock:
        entry = _codes.get(email)
        if not entry or time.time() > entry["expires"]:
            _codes.pop(email, None)
            return 400, {"error": "That code has expired or is no longer valid. Please ask for a new one."}
        if not hmac.compare_digest(entry["hash"], _hash(code)):
            entry["attempts"] += 1
            if entry["attempts"] >= MAX_ATTEMPTS:
                _codes.pop(email, None)
                return 400, {"error": "Too many wrong codes. Please ask for a new one."}
            return 400, {"error": "That code isn't right. Please check the email and try again."}
        #one use only
        _codes.pop(email, None)
    return 200, {"verified": True}
