#sends the order confirmation email after checkout and the password reset code email over SMTP, configured with environment
#variables (never put keys or passwords in the code):
#   SMTP_HOST      e.g. smtp.gmail.com
#   SMTP_PORT      587 for STARTTLS (default) or 465 for SSL
#   SMTP_USER      the account that logs in, e.g. longstorysub@gmail.com
#   SMTP_PASSWORD  for Gmail this is an "app password", not the normal password
#   MAIL_FROM      optional sender address, defaults to SMTP_USER
import os
import smtplib
import ssl
from email.message import EmailMessage
from html import escape

SHOP_NAME = "Long Story Sub"


class MailNotConfigured(Exception):
    pass


def check_configured():
    """raises MailNotConfigured unless SMTP is set up"""
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


def build_reset_code(code, minutes):
    """the password reset email -> (subject, plain text body, html body)"""
    subject = f"{SHOP_NAME}: your password reset code"
    text = "\n".join([
        "Someone asked to reset the password for your account.",
        "",
        f"Your code is: {code}",
        "",
        f"It expires in {minutes} minutes. If this wasn't you, you can ignore this email.",
        "",
        SHOP_NAME,
    ])
    html = f"""\
<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:auto;color:#1f2321">
  <h2 style="color:#d62a2a;margin-bottom:4px">Reset your password</h2>
  <p>Someone asked to reset the password for your account. Your code is:</p>
  <p style="font-size:32px;letter-spacing:8px;font-weight:bold;margin:16px 0">{escape(code)}</p>
  <p style="color:#6b6b6b;font-size:13px">It expires in {minutes} minutes. If this wasn't you, you can ignore this email.</p>
  <p>{SHOP_NAME}</p>
</div>"""
    return subject, text, html


def send_email(to, subject, text, html):
    settings = smtp_settings()

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = f"{SHOP_NAME} <{settings['sender']}>"
    message["To"] = to
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


def send_confirmation(order):
    subject, text, html = build_confirmation(order)
    send_email(order["email"], subject, text, html)


def send_reset_code(email, code, minutes):
    subject, text, html = build_reset_code(code, minutes)
    send_email(email, subject, text, html)
