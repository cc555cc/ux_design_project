#conversation tests for the sandwich ordering chatbot, run from the server folder with:
#   python -m unittest discover tests
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

import chatbot
from db import order_store
from learning_resource import model_learning
from models.order_session import NO_SELECTION, get_session


class ChatbotTestCase(unittest.TestCase):
    def setUp(self):
        #keep learning files and saved orders out of the real data folders
        temp_dir = Path(tempfile.mkdtemp())
        self.order_file = temp_dir / "orders.jsonl"
        save_order = order_store.save_order
        patches = [
            mock.patch.object(model_learning, "LEARNED_INTERACTIONS_FILE", temp_dir / "learned.jsonl"),
            mock.patch.object(model_learning, "LEARNING_LOG_FILE", temp_dir / "log.txt"),
            mock.patch.object(chatbot, "save_order", lambda *args: save_order(*args, file_path=self.order_file)),
        ]
        for patch in patches:
            patch.start()
            self.addCleanup(patch.stop)

        self.session_id, self.session = get_session()

    def say(self, message):
        return chatbot.generate_response(message, self.session_id)

    @property
    def order(self):
        return self.session["order"]


class OneStepOrderTest(ChatbotTestCase):
    def test_everything_in_one_sentence_goes_to_review(self):
        reply = self.say(
            "Can I get a footlong italian with turkey, swiss, lettuce, tomato and mayo for pickup at 12:30 under Carson"
        )

        self.assertEqual(self.session["status"], "confirming")
        self.assertEqual(self.order["size"], "Footlong")
        self.assertEqual(self.order["bread"], "Italian")
        self.assertEqual(self.order["protein"], "Turkey")
        self.assertEqual(self.order["cheese"], "Swiss")
        self.assertEqual(self.order["veggies"], ["Lettuce", "Tomato"])
        self.assertEqual(self.order["sauce"], ["Mayo"])
        self.assertEqual(self.order["name"], "Carson")
        self.assertEqual(self.order["pickup_time"], "12:30")
        self.assertIn("Shall I place the order?", reply)

    def test_order_without_order_keyword(self):
        self.say("6 inch honey oat with ham")

        self.assertEqual(self.session["status"], "building")
        self.assertEqual(self.order["bread"], "Honey Oat")
        self.assertEqual(self.order["size"], "6-inch")
        self.assertEqual(self.order["protein"], "Ham")
        self.assertEqual(self.session["pending"], "cheese")

    def test_with_everything_means_all_veggies(self):
        self.say("turkey footlong on wheat with everything and mayo")
        self.assertEqual(len(self.order["veggies"]), 10)
        self.assertEqual(self.order["sauce"], ["Mayo"])

    def test_name_given_before_it_is_asked(self):
        self.say("italian 6 inch ham")
        self.say("my name is Carson")
        self.assertEqual(self.order["name"], "Carson")
        self.assertEqual(self.session["pending"], "cheese")

    def test_partial_sentence_asks_only_missing_steps(self):
        reply = self.say("footlong wheat turkey with cheddar, no veggies, ranch")

        self.assertEqual(self.order["veggies"], [])
        self.assertEqual(self.order["sauce"], ["Ranch"])
        self.assertEqual(self.session["pending"], "name")
        self.assertIn("name", reply)


class StepByStepOrderTest(ChatbotTestCase):
    def test_full_step_by_step_flow(self):
        reply = self.say("I want to order a sandwich")
        self.assertEqual(self.session["pending"], "bread")
        self.assertIn("What bread", reply)

        self.say("whole wheat")
        self.assertEqual(self.session["pending"], "size")

        self.say("footlong please")
        self.assertEqual(self.session["pending"], "protein")

        self.say("chicken")
        self.assertEqual(self.session["pending"], "cheese")

        self.say("no thanks")
        self.assertEqual(self.order["cheese"], NO_SELECTION)
        self.assertEqual(self.session["pending"], "veggies")

        self.say("everything except onions")
        self.assertIn("Lettuce", self.order["veggies"])
        self.assertNotIn("Red Onion", self.order["veggies"])
        self.assertEqual(self.session["pending"], "sauce")

        self.say("chipotle and honey mustard")
        self.assertEqual(self.order["sauce"], ["Chipotle", "Honey Mustard"])
        self.assertEqual(self.session["pending"], "name")

        self.say("Zachary")
        self.assertEqual(self.order["name"], "Zachary")
        self.assertEqual(self.session["pending"], "pickup_time")

        self.say("1 pm")
        self.assertEqual(self.order["pickup_time"], "1pm")
        self.assertEqual(self.session["status"], "confirming")

        reply = self.say("yes")
        self.assertEqual(self.session["status"], "complete")
        self.assertIn(self.session["order_id"], reply)
        saved = order_store.load_orders(self.order_file)
        self.assertEqual(saved[0]["name"], "Zachary")
        self.assertEqual(saved[0]["sandwich"]["protein"], "Chicken")
        self.assertEqual(saved[0]["total"], 11.74)

    def test_unknown_answer_offers_options(self):
        self.say("start an order")
        reply = self.say("brioche")

        self.assertEqual(self.session["pending"], "bread")
        self.assertIn("Sorry", reply)
        self.assertIn("Honey Oat", reply)

    def test_vague_pickup_time_asks_for_specific_time(self):
        self.say("footlong italian ham, no cheese, no veggies, no sauce, under Aaraan")
        reply = self.say("this afternoon")

        self.assertEqual(self.session["pending"], "pickup_time")
        self.assertIn("specific pickup time", reply)


class ModifyOrderTest(ChatbotTestCase):
    def setUp(self):
        super().setUp()
        self.say("footlong italian turkey swiss lettuce onions mayo under Carson at noon")

    def test_swap_cheese(self):
        self.say("swap swiss for cheddar")
        self.assertEqual(self.order["cheese"], "Cheddar")

    def test_instead_of(self):
        self.say("ham instead of turkey")
        self.assertEqual(self.order["protein"], "Ham")

    def test_remove_veggie(self):
        self.say("no onions")
        self.assertEqual(self.order["veggies"], ["Lettuce"])
        self.assertEqual(self.session["status"], "confirming")

    def test_removing_single_choice_asks_again(self):
        reply = self.say("remove the turkey")
        self.assertIsNone(self.order["protein"])
        self.assertEqual(self.session["pending"], "protein")
        self.assertIn("What meat", reply)

    def test_reject_review_then_cancel(self):
        reply = self.say("no")
        self.assertIn("what would you like to change", reply)
        self.assertEqual(self.session["status"], "confirming")

        self.say("cancel")
        self.assertEqual(self.session["status"], "idle")


class SideQuestionTest(ChatbotTestCase):
    def test_hours_question_keeps_order(self):
        self.say("I'd like a sub")
        reply = self.say("what are your hours")

        self.assertIn("9 AM", reply)
        self.assertIn("What bread", reply)
        self.assertEqual(self.session["status"], "building")

    def test_menu_question(self):
        reply = self.say("show me the menu")
        self.assertIn("Pepper Jack", reply)


if __name__ == "__main__":
    unittest.main()
