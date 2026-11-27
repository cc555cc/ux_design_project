#tests for a second meat / cheese in a chat order ("turkey and beef"), with the keyword rules and with Claude.
#run from the server folder with:
#   python -m unittest discover tests
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

import chatbot
from test_chatbot import ChatbotTestCase
from test_claude_path import ClaudePathTestCase


class KeywordExtraMeatTest(ChatbotTestCase):
    def start_sub(self):
        self.say("honey oat footlong")

    def test_two_meats_keep_both(self):
        self.start_sub()
        reply = self.say("turkey and beef")

        self.assertEqual((self.order["protein"], self.order["extra_protein"]), ("Turkey", "Roast Beef"))
        self.assertIn("extra Roast Beef", reply)
        self.assertEqual(self.session["pending"], "cheese")

    def test_two_cheeses_keep_both(self):
        self.say("wheat 6 inch with turkey, cheddar and swiss")
        self.assertEqual((self.order["cheese"], self.order["extra_cheese"]), ("Cheddar", "Swiss"))

    def test_extra_meat_is_charged_like_the_order_page(self):
        self.start_sub()
        self.say("turkey and beef")
        #footlong 10.99 + honey oat 0.50 + turkey 0 + roast beef 1.00 + extra meat 1.50
        self.assertEqual(chatbot.calculate_total(self.order), 13.99)
        self.assertIn("Turkey + Roast Beef (extra meat +$1.50)", chatbot.build_order_review(self.order))

    def test_removing_the_main_meat_keeps_the_extra(self):
        self.start_sub()
        self.say("turkey and beef")
        self.say("no turkey")
        self.assertEqual((self.order["protein"], self.order["extra_protein"]), ("Roast Beef", None))

    def test_removing_the_extra_meat(self):
        self.start_sub()
        self.say("turkey and beef")
        self.say("no beef")
        self.assertEqual((self.order["protein"], self.order["extra_protein"]), ("Turkey", None))

    def test_one_meat_still_replaces(self):
        self.start_sub()
        self.say("turkey")
        self.say("change to chicken")
        self.assertEqual((self.order["protein"], self.order["extra_protein"]), ("Chicken", None))

    def test_no_meat_clears_the_extra(self):
        self.start_sub()
        self.say("turkey and beef")
        self.say("no meat")
        self.assertEqual((self.order["protein"], self.order["extra_protein"]), ("none", None))


class ClaudeExtraMeatTest(ClaudePathTestCase):
    def test_two_meats_from_claude(self):
        self.claude_says("honey oat footlong", bread="Honey Oat", size="Footlong")
        reply = self.claude_says("a turkey and beef", protein="Turkey", extra_protein="Roast Beef")

        self.assertEqual((self.order["protein"], self.order["extra_protein"]), ("Turkey", "Roast Beef"))
        self.assertIn("extra Roast Beef", reply)
        self.assertNotIn("didn't catch", reply)

    def test_extra_needs_a_different_main(self):
        self.claude_says("wheat footlong", bread="Wheat", size="Footlong")
        self.claude_says("turkey", protein="Turkey", extra_protein="Turkey")
        self.assertIsNone(self.order["extra_protein"])

    def test_extra_moved_up_when_main_removed(self):
        self.claude_says("wheat footlong", bread="Wheat", size="Footlong")
        self.claude_says("turkey and beef", protein="Turkey", extra_protein="Roast Beef")
        reply = self.claude_says("no turkey", protein="Roast Beef", extra_protein="none")

        self.assertEqual((self.order["protein"], self.order["extra_protein"]), ("Roast Beef", None))
        self.assertNotIn("no Roast Beef", reply)


if __name__ == "__main__":
    unittest.main()
