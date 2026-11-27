#tests for POST /api/orders/confirmation-email: input checks, the send limit, and the email text.
#no email is really sent: send_confirmation is replaced with a mock. run from the server folder with:
#   python -m unittest discover tests
import json
import sys
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

import mailer
from routes import orders

VALID = {
    "email": "customer@example.com",
    "name": "Sam",
    "fulfillment": "delivery",
    "address": "12 King St",
    "time": "12:30 PM",
    "order_id": "order-1",
    "total": 8.24,
    "items": [{"quantity": 1, "size": "6-inch", "summary": "Italian Herbs, Chicken", "total": 8.24}],
}


class ConfirmationEmailTestCase(unittest.TestCase):
    def setUp(self):
        orders._sent_log.clear()
        patcher = mock.patch.object(orders, "send_confirmation")
        self.send = patcher.start()
        self.addCleanup(patcher.stop)
        settings_patcher = mock.patch.object(orders, "check_configured")
        self.settings = settings_patcher.start()
        self.addCleanup(settings_patcher.stop)

    def test_valid_order_is_sent(self):
        status, body = orders.handle_confirmation_email(dict(VALID))
        self.assertEqual((status, body), (200, {"sent": True}))
        self.assertEqual(self.send.call_args.args[0]["email"], "customer@example.com")

    def test_rejects_bad_email(self):
        status, _ = orders.handle_confirmation_email({**VALID, "email": "not-an-email"})
        self.assertEqual(status, 400)
        self.send.assert_not_called()

    def test_rejects_header_injection_in_email(self):
        status, _ = orders.handle_confirmation_email({**VALID, "email": "a@b.com\nBcc: x@y.com"})
        self.assertEqual(status, 400)

    def test_delivery_needs_address_but_pickup_does_not(self):
        self.assertEqual(orders.handle_confirmation_email({**VALID, "address": ""})[0], 400)
        self.assertEqual(orders.handle_confirmation_email({**VALID, "fulfillment": "pickup", "address": ""})[0], 200)

    def test_rejects_bad_items(self):
        self.assertEqual(orders.handle_confirmation_email({**VALID, "items": []})[0], 400)
        bad_item = {**VALID["items"][0], "size": "huge"}
        self.assertEqual(orders.handle_confirmation_email({**VALID, "items": [bad_item]})[0], 400)

    def test_limits_emails_to_one_address(self):
        for _ in range(orders.PER_ADDRESS_LIMIT):
            self.assertEqual(orders.handle_confirmation_email(dict(VALID))[0], 200)
        self.assertEqual(orders.handle_confirmation_email(dict(VALID))[0], 429)
        self.assertEqual(orders.handle_confirmation_email({**VALID, "email": "other@example.com"})[0], 200)

    def test_not_configured_returns_503_without_using_the_limit(self):
        self.settings.side_effect = mailer.MailNotConfigured("Email is not set up on the server.")
        self.assertEqual(orders.handle_confirmation_email(dict(VALID))[0], 503)
        self.send.assert_not_called()
        self.assertEqual(orders._sent_log, [])


class ConfirmationTextTestCase(unittest.TestCase):
    def test_email_lists_the_order_and_escapes_html(self):
        order, error = orders.validate_confirmation({**VALID, "name": "<b>Sam</b>"})
        self.assertIsNone(error)
        subject, text, html = mailer.build_confirmation(order)
        self.assertIn("order confirmed", subject)
        self.assertIn("Delivery to 12 King St", text)
        self.assertIn("$8.24", text)
        self.assertNotIn("<b>Sam</b>", html)
        self.assertIn("&lt;b&gt;Sam&lt;/b&gt;", html)

    def test_missing_settings_raise(self):
        with mock.patch.dict(mailer.os.environ, {}, clear=True):
            with self.assertRaises(mailer.MailNotConfigured):
                mailer.check_configured()


class BrevoTestCase(unittest.TestCase):
    def setUp(self):
        self.order, _ = orders.validate_confirmation(dict(VALID))

    def test_brevo_is_used_when_its_key_is_set(self):
        env = {"BREVO_API_KEY": "test-key", "MAIL_FROM": "shop@example.com", "SMTP_HOST": "smtp.gmail.com"}
        with mock.patch.dict(mailer.os.environ, env, clear=True), \
                mock.patch.object(mailer.urllib.request, "urlopen") as urlopen, \
                mock.patch.object(mailer.smtplib, "SMTP") as smtp:
            mailer.send_confirmation(self.order)

        smtp.assert_not_called()
        request = urlopen.call_args.args[0]
        self.assertEqual(request.full_url, mailer.BREVO_URL)
        self.assertEqual(request.get_header("Api-key"), "test-key")
        body = json.loads(request.data)
        self.assertEqual(body["sender"]["email"], "shop@example.com")
        self.assertEqual(body["to"][0]["email"], "customer@example.com")
        self.assertIn("$8.24", body["textContent"])

    def test_brevo_needs_a_sender(self):
        with mock.patch.dict(mailer.os.environ, {"BREVO_API_KEY": "test-key"}, clear=True):
            with self.assertRaises(mailer.MailNotConfigured):
                mailer.check_configured()

    def test_smtp_is_used_without_a_brevo_key(self):
        env = {"SMTP_HOST": "smtp.gmail.com", "SMTP_USER": "shop@gmail.com", "SMTP_PASSWORD": "abcd efgh ijkl mnop"}
        with mock.patch.dict(mailer.os.environ, env, clear=True), \
                mock.patch.object(mailer.urllib.request, "urlopen") as urlopen, \
                mock.patch.object(mailer.ssl, "create_default_context"), \
                mock.patch.object(mailer.smtplib, "SMTP") as smtp:
            mailer.send_confirmation(self.order)

        urlopen.assert_not_called()
        smtp.return_value.__enter__.return_value.login.assert_called_once_with("shop@gmail.com", "abcdefghijklmnop")


if __name__ == "__main__":
    unittest.main()
