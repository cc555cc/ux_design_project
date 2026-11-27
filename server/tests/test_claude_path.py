#tests for the Claude path of the chatbot: Claude's reply is faked, so these check how the chatbot applies it
#without calling the API. run from the server folder with:
#   python -m unittest discover tests
import sys
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

import anthropic

import chatbot
from message_interpreter import NOT_CHOSEN
from models.order_session import NO_SELECTION
from test_chatbot import ChatbotTestCase

FULL_SUB = {
    "bread": "Wheat", "size": "Footlong", "protein": "Turkey", "cheese": "Swiss",
    "veggies_chosen": True, "veggies": ["Lettuce", "Tomato"], "sauce_chosen": True, "sauce": ["Mayo"],
    "name": "Carson", "pickup_time": "12:30pm",
}


class ClaudePathTestCase(ChatbotTestCase):
    def setUp(self):
        super().setUp()
        env_patch = mock.patch.dict(chatbot.os.environ, {"ANTHROPIC_API_KEY": "test-key"})
        env_patch.start()
        self.addCleanup(env_patch.stop)
        self.claude_reply = None
        interpret_patch = mock.patch.object(chatbot, "interpret_message", lambda *args: self.claude_reply)
        interpret_patch.start()
        self.addCleanup(interpret_patch.stop)

    #what Claude would return: the current order with the given fields changed
    def claude_says(self, message, action="order", topic="none", **fields):
        order = self.order if self.session["status"] in chatbot.ACTIVE_STATUSES else chatbot.new_order()
        reply = {"action": action, "topic": topic, "not_on_menu": [],
                 "name": order["name"] or "", "pickup_time": order["pickup_time"] or ""}
        for category in chatbot.SINGLE_FIELDS:
            reply[category] = NOT_CHOSEN if order[category] is None else order[category]
        for category in chatbot.LIST_FIELD_ORDER:
            reply[f"{category}_chosen"] = order[category] is not None
            reply[category] = list(order[category] or [])
        reply.update(fields)
        self.claude_reply = reply
        return self.say(message)

    def order_full_sub(self):
        return self.claude_says("footlong turkey on wheat, swiss, lettuce tomato, mayo, for Carson at 12:30pm", **FULL_SUB)


class ClaudeOrderTest(ClaudePathTestCase):
    def test_full_order_goes_to_review(self):
        reply = self.order_full_sub()

        self.assertEqual(self.session["status"], "confirming")
        self.assertIn("Here's your order", reply)
        self.assertEqual(self.order["veggies"], ["Lettuce", "Tomato"])

    def test_remove_all_empties_the_sub_but_keeps_name_and_time(self):
        self.order_full_sub()
        reply = self.claude_says(
            "remove all", bread=NOT_CHOSEN, size=NOT_CHOSEN, protein=NOT_CHOSEN, cheese=NOT_CHOSEN,
            veggies_chosen=False, veggies=[], sauce_chosen=False, sauce=[],
        )

        for category in chatbot.SINGLE_FIELDS + chatbot.LIST_FIELD_ORDER:
            self.assertIsNone(self.order[category])
        self.assertEqual(self.order["name"], "Carson")
        self.assertEqual(self.order["pickup_time"], "12:30pm")
        self.assertIn("removed everything from your sub", reply)
        self.assertIn("What bread would you like?", reply)
        self.assertEqual(self.session["status"], "building")

    def test_remove_all_veggies(self):
        self.order_full_sub()
        reply = self.claude_says("remove all veggies", veggies=[])

        self.assertEqual(self.order["veggies"], [])
        #the review is showing, so the reply is the updated review
        self.assertIn("- Veggies: None", reply)
        self.assertEqual(self.session["status"], "confirming")

    def test_swap_and_no_cheese(self):
        self.order_full_sub()
        self.claude_says("swap turkey for chicken and no cheese", protein="Chicken", cheese="none")

        self.assertEqual(self.order["protein"], "Chicken")
        self.assertEqual(self.order["cheese"], NO_SELECTION)

    def test_items_that_do_not_fit_are_left_out(self):
        reply = self.claude_says(
            "footlong turkey swiss on wheat with every veggie and all sauces",
            bread="Wheat", size="Footlong", protein="Turkey", cheese="Swiss",
            veggies_chosen=True, veggies=[item["name"] for item in chatbot.MENU_ITEMS["veggies"]],
            sauce_chosen=True, sauce=["Mayo", "Ranch"],
        )

        self.assertEqual(chatbot.count_selected_ingredients(self.order), chatbot.MAX_ORDER_INGREDIENTS)
        self.assertIn("I left out", reply)

    def test_item_not_on_menu_is_mentioned(self):
        reply = self.claude_says(
            "turkey with mozzarella", protein="Turkey",
            not_on_menu=[{"category": "cheese", "item": "mozzarella"}],
        )

        self.assertIn("Sorry, we don't have mozzarella", reply)
        self.assertIsNone(self.order["cheese"])

    def test_pickup_outside_opening_hours(self):
        reply = self.claude_says("pickup at 11pm", pickup_time="11pm")

        self.assertIsNone(self.order["pickup_time"])
        self.assertIn("between 9 AM and 9 PM", reply)


class ClaudeActionTest(ClaudePathTestCase):
    def test_confirm_places_the_order(self):
        self.order_full_sub()
        reply = self.claude_says("yes please", action="confirm")

        self.assertEqual(self.session["status"], "complete")
        self.assertIn("Your order is placed", reply)

    def test_side_question_keeps_the_order(self):
        self.claude_says("turkey please", protein="Turkey")
        reply = self.claude_says("when are you open?", action="question", topic="hours")

        self.assertIn("9 AM to 9 PM", reply)
        self.assertIn("What bread would you like?", reply)
        self.assertEqual(self.order["protein"], "Turkey")

    def test_cancel(self):
        self.order_full_sub()
        reply = self.claude_says("cancel it", action="cancel")

        self.assertEqual(self.session["status"], "idle")
        self.assertIn("cancelled", reply)

    def test_falls_back_to_keyword_rules_when_the_api_fails(self):
        error = anthropic.APIConnectionError(request=mock.Mock())
        with mock.patch.object(chatbot, "interpret_message", side_effect=error):
            reply = self.say("footlong turkey on wheat")

        self.assertEqual(self.order["protein"], "Turkey")
        self.assertIn("Got it", reply)


if __name__ == "__main__":
    unittest.main()
