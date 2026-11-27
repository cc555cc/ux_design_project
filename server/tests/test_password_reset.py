#tests for POST /api/auth/reset-code and /api/auth/verify-reset. no email is really sent: send_reset_code is mocked
#and the code it was given is read back from the mock. run from the server folder with:
#   python -m unittest discover tests
import sys
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

import mailer
from routes import auth

EMAIL = "sam@example.com"


class PasswordResetTestCase(unittest.TestCase):
    def setUp(self):
        auth._codes.clear()
        auth._sent_log.clear()
        send = mock.patch.object(auth, "send_reset_code")
        self.send = send.start()
        self.addCleanup(send.stop)
        configured = mock.patch.object(auth, "check_configured")
        self.configured = configured.start()
        self.addCleanup(configured.stop)

    def request_code(self, email=EMAIL):
        status, body = auth.handle_reset_code({"email": email})
        self.assertEqual(status, 200, body)
        return self.send.call_args.args[1]

    def test_code_is_emailed_and_verifies_once(self):
        code = self.request_code()
        self.assertRegex(code, r"^\d{6}$")
        self.assertEqual(self.send.call_args.args[0], EMAIL)
        self.assertEqual(auth.handle_verify_reset({"email": EMAIL, "code": code}), (200, {"verified": True}))
        self.assertEqual(auth.handle_verify_reset({"email": EMAIL, "code": code})[0], 400)

    def test_email_is_case_insensitive(self):
        code = self.request_code("Sam@Example.com")
        self.assertEqual(auth.handle_verify_reset({"email": "sam@example.COM", "code": f" {code} "})[0], 200)

    def test_wrong_code_and_attempt_limit(self):
        code = self.request_code()
        wrong = "000000" if code != "000000" else "111111"
        for _ in range(auth.MAX_ATTEMPTS):
            self.assertEqual(auth.handle_verify_reset({"email": EMAIL, "code": wrong})[0], 400)
        #the code is thrown away after too many wrong guesses, even the right one fails now
        self.assertEqual(auth.handle_verify_reset({"email": EMAIL, "code": code})[0], 400)

    def test_expired_code_fails(self):
        code = self.request_code()
        auth._codes[EMAIL]["expires"] = 0
        status, body = auth.handle_verify_reset({"email": EMAIL, "code": code})
        self.assertEqual(status, 400)
        self.assertIn("expired", body["error"])

    def test_new_code_replaces_old(self):
        first = self.request_code()
        second = self.request_code()
        if first != second:
            self.assertEqual(auth.handle_verify_reset({"email": EMAIL, "code": first})[0], 400)
        self.assertEqual(auth.handle_verify_reset({"email": EMAIL, "code": second})[0], 200)

    def test_rejects_bad_email(self):
        self.assertEqual(auth.handle_reset_code({"email": "nope"})[0], 400)
        self.assertEqual(auth.handle_reset_code({"email": "a@b.com\nBcc: x@y.com"})[0], 400)
        self.send.assert_not_called()

    def test_send_limit_per_address(self):
        for _ in range(auth.PER_ADDRESS_LIMIT):
            self.request_code()
        self.assertEqual(auth.handle_reset_code({"email": EMAIL})[0], 429)
        self.assertEqual(auth.handle_reset_code({"email": "other@example.com"})[0], 200)

    def test_not_configured_returns_503(self):
        self.configured.side_effect = mailer.MailNotConfigured("Email is not set up on the server.")
        self.assertEqual(auth.handle_reset_code({"email": EMAIL})[0], 503)
        self.send.assert_not_called()

    def test_failed_send_returns_502_and_drops_code(self):
        self.send.side_effect = OSError("timed out")
        self.assertEqual(auth.handle_reset_code({"email": EMAIL})[0], 502)
        self.assertNotIn(EMAIL, auth._codes)


class ResetEmailTextTestCase(unittest.TestCase):
    def test_email_contains_code(self):
        subject, text, html = mailer.build_reset_code("123456", 10)
        self.assertIn("reset", subject.lower())
        self.assertIn("123456", text)
        self.assertIn("123456", html)


if __name__ == "__main__":
    unittest.main()
