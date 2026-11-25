#conversation tests for the sandwich ordering chatbot, run from the server folder with:
#   python -m unittest discover tests
import re
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

import chatbot
from db import order_store
from learning_resource import model_learning, response_database, response_database_minimal
from models import order_session
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


class SessionLifecycleTest(unittest.TestCase):
    def test_expired_session_is_replaced_with_fresh_order(self):
        session_id, session = get_session()
        session["order"]["bread"] = "Italian"

        with mock.patch.object(order_session.time, "monotonic", return_value=(
            session["last_accessed"] + order_session.SESSION_TTL_SECONDS + 1
        )):
            restored_id, restored_session = get_session(session_id)

        self.assertEqual(restored_id, session_id)
        self.assertIsNone(restored_session["order"]["bread"])
        self.assertNotEqual(restored_session, session)


class OneStepOrderTest(ChatbotTestCase):
    def test_everything_in_one_sentence_goes_to_review(self):
        reply = self.say(
            "Can I get a footlong italian with turkey, swiss, lettuce, tomato and mayo for pickup at 12:30 under Carson"
        )

        self.assertEqual(self.session["status"], "confirming")
        self.assertEqual(self.order["size"], "Footlong")
        self.assertEqual(self.order["bread"], "Italian Herbs")
        self.assertEqual(self.order["protein"], "Turkey")
        self.assertEqual(self.order["cheese"], "Swiss")
        self.assertEqual(self.order["veggies"], ["Lettuce", "Tomato"])
        self.assertEqual(self.order["sauce"], ["Mayo"])
        self.assertEqual(self.order["name"], "Carson")
        self.assertEqual(self.order["pickup_time"], "12:30")
        self.assertIn("Shall I place the order?", reply)

    def test_order_without_order_keyword(self):
        self.say("6 inch honey oat with roast beef")

        self.assertEqual(self.session["status"], "building")
        self.assertEqual(self.order["bread"], "Honey Oat")
        self.assertEqual(self.order["size"], "6-inch")
        self.assertEqual(self.order["protein"], "Roast Beef")
        self.assertEqual(self.session["pending"], "cheese")

    def test_with_everything_means_all_veggies(self):
        self.say("turkey footlong on wheat with everything and mayo")
        self.assertEqual(
            chatbot.count_selected_ingredients(self.order),
            chatbot.MAX_ORDER_INGREDIENTS,
        )
        #the mayo was asked for by name, so it is kept and one veggie is left out
        self.assertEqual(self.order["sauce"], ["Mayo"])
        self.assertEqual(len(self.order["veggies"]), 5)

    def test_name_given_before_it_is_asked(self):
        self.say("italian 6 inch turkey")
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
        self.assertNotIn("Red onion", self.order["veggies"])
        self.assertEqual(self.session["pending"], "sauce")

        reply = self.say("chipotle and honey mustard")
        self.assertIn("don't have honey mustard", reply)
        self.assertEqual(self.order["sauce"], ["Chipotle"])
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
        self.say("footlong italian turkey, no cheese, no veggies, no sauce, under Aaraan")
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
        self.say("chicken instead of turkey")
        self.assertEqual(self.order["protein"], "Chicken")

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
        self.assertIn("Provolone", reply)

    def test_contact_details_match_the_site(self):
        self.assertIn("hello@longstorysub.com", self.say("what is your email"))

    def test_delivery_question(self):
        self.assertIn("5 km", self.say("can I order delivery?"))
        self.assertEqual(self.session["status"], "idle")


#the menu must stay in step with toppingOptions on the order page
class MenuMatchesOrderPageTest(ChatbotTestCase):
    def test_same_items_as_order_page(self):
        page = Path(__file__).resolve().parents[2] / "client" / "src" / "sections" / "order.tsx"
        if not page.exists():
            self.skipTest("client is not available")
        found = re.findall(r'\{ name: "([^"]+)", color: "[^"]+", category: "([^"]+)"', page.read_text(encoding="utf-8"))
        page_menu = {}
        for name, category in found:
            page_menu.setdefault(category.lower(), []).append(name)
        chat_menu = {
            category: [item["name"] for item in items]
            for category, items in response_database.MENU_ITEMS.items() if category != "size"
        }
        self.assertEqual(chat_menu, page_menu)

    def test_baseline_database_is_the_same(self):
        for field in ("MENU_ITEMS", "UNAVAILABLE_ITEMS", "BUSINESS_INFO"):
            self.assertEqual(getattr(response_database, field), getattr(response_database_minimal, field))


class UnavailableItemTest(ChatbotTestCase):
    def test_unavailable_item_is_explained_and_asked_again(self):
        self.say("start an order")
        self.say("wheat footlong")
        reply = self.say("ham")
        self.assertIn("don't have ham", reply)
        self.assertIn("Turkey, Roast Beef, Chicken", reply)
        self.assertIsNone(self.order["protein"])
        self.assertEqual(self.session["pending"], "protein")

    def test_longer_names_do_not_match_real_items(self):
        self.say("footlong wheat turkey with pepper jack, banana peppers, lettuce and sweet onion sauce")
        self.assertIsNone(self.order["cheese"])
        self.assertEqual(self.order["veggies"], ["Lettuce"])

    def test_no_to_an_unavailable_item_changes_nothing(self):
        self.say("footlong wheat turkey swiss lettuce onions mayo under Carson at noon")
        self.say("no pickles or onions")
        self.assertEqual(self.order["veggies"], ["Lettuce"])

    def test_swapping_for_an_unavailable_item_keeps_the_original(self):
        self.say("footlong wheat turkey swiss lettuce mayo under Carson at noon")
        reply = self.say("swap swiss for mozzarella")
        self.assertIn("don't have mozzarella", reply)
        self.assertIn("Provolone", reply)
        self.assertEqual(self.order["cheese"], "Swiss")
        self.assertIn("Shall I place the order?", reply)

    def test_delivery_order_is_told_it_is_pickup(self):
        reply = self.say("footlong wheat turkey for delivery")
        self.assertIn("for pickup", reply)
        self.assertIsNone(self.order["name"])
        self.assertEqual(self.order["protein"], "Turkey")


class PortionLimitTest(ChatbotTestCase):
    def test_left_out_items_are_mentioned(self):
        reply = self.say("turkey swiss footlong on wheat with everything")
        self.assertIn("left out Black olives", reply)
        self.assertNotIn("all veggies", reply)
        reply = self.say("ranch")
        self.assertIn("left out Ranch", reply)

    def test_everything_does_not_replace_named_items(self):
        self.say("turkey swiss footlong on wheat with everything")
        self.assertEqual(self.order["bread"], "Wheat")
        self.assertEqual(self.order["size"], "Footlong")
        self.assertEqual(self.order["protein"], "Turkey")
        self.assertEqual(self.order["cheese"], "Swiss")
        self.assertEqual(len(self.order["veggies"]), 5)

    def test_removing_a_veggie_does_not_answer_the_cheese_question(self):
        self.say("footlong wheat turkey lettuce cucumber")
        self.assertEqual(self.session["pending"], "cheese")
        self.say("no cucumber")
        self.assertEqual(self.order["veggies"], ["Lettuce"])
        self.assertIsNone(self.order["cheese"])
        self.assertEqual(self.session["pending"], "cheese")

    def test_no_notice_when_everything_fits(self):
        reply = self.say("turkey footlong on wheat with everything")
        self.assertIn("all veggies", reply)
        self.assertNotIn("left out", reply)


class PickupHoursTest(ChatbotTestCase):
    def setUp(self):
        super().setUp()
        self.say("footlong wheat turkey, no cheese, no veggies, no sauce, under Carson")

    def test_closed_times_are_refused(self):
        for closed in ("3 am", "at 11pm", "8:30am", "25:99", "9:01 pm"):
            reply = self.say(closed)
            self.assertIn("between 9 AM and 9 PM", reply, closed)
            self.assertIsNone(self.order["pickup_time"], closed)
            self.assertEqual(self.session["pending"], "pickup_time", closed)

    def test_open_times_are_accepted(self):
        for open_time in ("9 am", "9pm", "noon", "12:30", "5", "ASAP"):
            self.order["pickup_time"] = None
            self.session["pending"] = "pickup_time"
            self.session["status"] = "building"
            self.say(open_time)
            self.assertIsNotNone(self.order["pickup_time"], open_time)

    def test_changing_to_a_closed_time_keeps_the_agreed_time(self):
        self.say("12:30")
        reply = self.say("make it at 11 pm")
        self.assertEqual(self.order["pickup_time"], "12:30")
        self.assertIn("kept your pickup at 12:30", reply)


class AccountOrderTest(ChatbotTestCase):
    def test_saved_order_includes_account_id_when_logged_in(self):
        self.session["account_id"] = "acct-demo"
        self.say("footlong italian turkey swiss lettuce mayo under Demo at noon")
        self.say("yes")

        saved = order_store.load_orders(self.order_file)
        self.assertEqual(saved[0]["account_id"], "acct-demo")

    def test_saved_order_omits_account_id_when_logged_out(self):
        self.say("footlong italian turkey swiss lettuce mayo under Guest at noon")
        self.say("yes")

        saved = order_store.load_orders(self.order_file)
        self.assertNotIn("account_id", saved[0])


if __name__ == "__main__":
    unittest.main()
