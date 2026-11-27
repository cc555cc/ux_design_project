#sends the order confirmation email after checkout on the order page, configured with environment variables
#(never put keys or passwords in the code). two ways to send, the first one that is set up is used:
#
#1. Brevo's web API (HTTPS). use this on hosts that block email ports, e.g. Railway's free/Hobby plans:
#   BREVO_API_KEY  from brevo.com -> SMTP & API -> API keys
#   MAIL_FROM      the sender address, verified in Brevo (Senders, domains & IPs -> Senders)
#2. SMTP, e.g. Gmail (works when running locally):
#   SMTP_HOST      e.g. smtp.gmail.com
#   SMTP_PORT      587 for STARTTLS (default) or 465 for SSL
#   SMTP_USER      the account that logs in, e.g. longstorysub@gmail.com
#   SMTP_PASSWORD  for Gmail this is an "app password", not the normal password
#   MAIL_FROM      optional sender address, defaults to SMTP_USER
import json
import os
import smtplib
import ssl
import urllib.request
from email.message import EmailMessage
from html import escape

SHOP_NAME = "Long Story Sub"
BREVO_URL = "https://api.brevo.com/v3/smtp/email"


class MailNotConfigured(Exception):
    pass


def brevo_settings():
    """the Brevo key and sender, or None when Brevo isn't set up"""
    key = os.environ.get("BREVO_API_KEY")
    if not key:
        return None
    sender = os.environ.get("MAIL_FROM")
    if not sender:
        raise MailNotConfigured("Email is not set up on the server: MAIL_FROM is missing.")
    return {"key": key.strip(), "sender": sender.strip()}


def check_configured():
    """raises MailNotConfigured unless Brevo or SMTP is set up"""
    if brevo_settings() is None:
        smtp_settings()


def smtp_settings():
    host = os.environ.get("SMTP_HOST")
    user = os.environ.get("SMTP_USER")
    password = os.environ.get("SMTP_PASSWORD")
    if not (host and user and password):
        raise MailNotConfigured("Email is not set up on the server.")
    if "gmail" in host.lower():
        #Google shows app passwords in groups ("abcd efgh ijkl mnop"); the spaces are not part of the password
        password = "".join(password.split())
    return {
        "host": host,
        "port": int(os.environ.get("SMTP_PORT", "587")),
        "user": user,
        "password": password,
        "sender": os.environ.get("MAIL_FROM") or user,
    }


def money(value):
    return f"${value:.2f}"


def build_confirmation(order):
    """order: the validated dict from routes/orders.py -> (subject, plain text body, html body)"""
    is_delivery = order["fulfillment"] == "delivery"
    when = "as soon as possible" if order["time"] == "ASAP" else order["time"]
    if is_delivery:
        how = f"Delivery to {order['address']}, {when}."
    else:
        how = f"Pickup at the shop, {when}."

    lines = [f"{item['quantity']} x {item['size']} sub: {item['summary']} ({money(item['total'])})" for item in order["items"]]
    subject = f"{SHOP_NAME}: order confirmed"
    text = "\n".join([
        f"Hi {order['name']},",
        "",
        "Thanks for your order! Here's what we're making for you:",
        "",
        *lines,
        "",
        f"Total: {money(order['total'])}",
        how,
        "",
        f"Order number: {order['order_id']}",
        "",
        f"See you soon,\n{SHOP_NAME}",
    ])

    rows = "".join(
        f"<tr><td style='padding:6px 0'>{item['quantity']} × {escape(item['size'])} sub<br>"
        f"<span style='color:#6b6b6b;font-size:13px'>{escape(item['summary'])}</span></td>"
        f"<td style='padding:6px 0;text-align:right;vertical-align:top'>{money(item['total'])}</td></tr>"
        for item in order["items"]
    )
    html = f"""\
<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:auto;color:#1f2321">
  <h2 style="color:#d62a2a;margin-bottom:4px">Order confirmed</h2>
  <p>Hi {escape(order['name'])}, thanks for your order! Here's what we're making for you:</p>
  <table style="width:100%;border-collapse:collapse;border-top:1px solid #ddd;border-bottom:1px solid #ddd">{rows}</table>
  <p style="font-size:18px"><strong>Total: {money(order['total'])}</strong></p>
  <p>{escape(how)}</p>
  <p style="color:#6b6b6b;font-size:13px">Order number: {escape(order['order_id'])}</p>
  <p>See you soon,<br>{SHOP_NAME}</p>
</div>"""
    return subject, text, html


def send_with_brevo(settings, order, subject, text, html):
    payload = {
        "sender": {"name": SHOP_NAME, "email": settings["sender"]},
        "to": [{"email": order["email"], "name": order["name"]}],
        "subject": subject,
        "textContent": text,
        "htmlContent": html,
    }
    request = urllib.request.Request(
        BREVO_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"api-key": settings["key"], "Content-Type": "application/json", "Accept": "application/json"},
        method="POST",
    )
    #an HTTP error status raises urllib.error.HTTPError, which the route reports as "could not be sent"
    with urllib.request.urlopen(request, timeout=15) as response:
        response.read()


def send_confirmation(order):
    subject, text, html = build_confirmation(order)
    brevo = brevo_settings()
    if brevo:
        send_with_brevo(brevo, order, subject, text, html)
        return

    settings = smtp_settings()

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = f"{SHOP_NAME} <{settings['sender']}>"
    message["To"] = order["email"]
    message.set_content(text)
    message.add_alternative(html, subtype="html")

    context = ssl.create_default_context()
    if settings["port"] == 465:
        with smtplib.SMTP_SSL(settings["host"], settings["port"], context=context, timeout=15) as smtp:
            smtp.login(settings["user"], settings["password"])
            smtp.send_message(message)
    else:
        with smtplib.SMTP(settings["host"], settings["port"], timeout=15) as smtp:
            smtp.starttls(context=context)
            smtp.login(settings["user"], settings["password"])
            smtp.send_message(message)
