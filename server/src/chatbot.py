#this script contains the logic of the chatbot for generating response based on extracted intentions,
#unknown word that presents in the query with known word will be learned and stored in learned_interaction.py
#failure to extract intentions will result in the chatbot guessing intention with unfamiliar word based on learned interactions.
#Finally, if guessing fail, the chatbot return generic response, telling the user that it do not understand the query.
#**adapted from restaurant booking to sandwich ordering, see server/CHATBOT_CHANGES.md for the logic changes
from learning_resource.response_database import BUSINESS_INFO, INTENT_KEYWORDS, MENU_ITEMS, ORDER_FIELD_KEYWORDS, ORDER_KEYWORDS, NUMBER_WORDS, STOP_WORDS
from db.order_store import save_order
from models.order_session import (
    ACTIVE_STATUSES, LIST_FIELDS, NO_SELECTION, OPTIONAL_FIELDS,
    get_session, next_missing_step, start_new_order,
)
from learning_resource.model_learning import appending_learning_entry, predict_intent_from_learned_entries
from text_normalization import lemmatize_word, lemmatize_words
import random


NAME_PREFIX_WORDS = {"the", "a", "an", "name", "is"}
#intents that can be answered in the middle of an order without losing the order progress
SIDE_QUESTION_INTENTS = {"operation", "contact", "menu"}
#words that can never be a customer name
NON_NAME_WORDS = (
    set(STOP_WORDS)
    | set(NUMBER_WORDS)
    | {keyword for category in INTENT_KEYWORDS.values() for keywords in category.values() for keyword in keywords}
    | {word for keywords in ORDER_KEYWORDS.values() if isinstance(keywords, list) for keyword in keywords for word in keyword.split()}
    | {word for keywords in ORDER_KEYWORDS["category"].values() for word in keywords}
    | {word for items in MENU_ITEMS.values() for item in items for alias in item["aliases"] for word in alias.split()}
    | {word for keywords in ORDER_FIELD_KEYWORDS["time"].values() for word in keywords}
    | {word for keywords in ORDER_FIELD_KEYWORDS["name"].values() for word in keywords}
    | {"it's", "its", "this", "call", "name's", "names", "just", "thanks", "thank"}
)
FILLER_WORDS = {"the", "any", "a", "an", "some", "more", "extra", "my", "of"}


#called by UI
def generate_response(phrase, session_id=None):
    session_id, session = get_session(session_id)
    word_list = parse_phrase(phrase)
    intents = get_intent(phrase)

    #an order is in progress: keep collecting order details, unless the user asks a side question
    #such as the opening hours, then answer it and repeat the pending question
    if session["status"] in ACTIVE_STATUSES:
        if intents[1] in SIDE_QUESTION_INTENTS and not has_order_signals(word_list, session["pending"]):
            return f"{get_response(phrase, intents, session=session)}\n{prompt_for_step(session)}"

        return continue_order(word_list, session)

    return get_response(phrase, intents, session=session)

def parse_phrase(phrase):
    parse_list = []

    #split the phrase into individual words and store them in a list.
    for word in phrase.lower().split():
        cleaned_word = word.strip(".,!?;:").replace(".", "")
        if cleaned_word:
            parse_list.append(cleaned_word)

    return parse_list

#procedure to extract intent from the conversation
def get_intent(phrase):
    word_list = parse_phrase(phrase)
    normalized_words = lemmatize_words(word_list)

    #determine the top intention: operation info, contact, service ...
    top_intent = top_level_intent(normalized_words)

    #a sentence that names ingredients is an order even without the word "order", e.g. "footlong turkey on wheat"
    if top_intent != "service" and has_order_signals(word_list):
        top_intent = "service"
        return [top_intent, "order"]

    #determine sub-level intention
    sub_intent = second_level_intent(top_intent, normalized_words)

    return [top_intent, sub_intent]

def top_level_intent(word_list):
    greeting_detected = False

    #extract the categories / subcategories name where the keyword was found in, which then represents the intention of the query
    for word in word_list:
        for category_name, subcategories in INTENT_KEYWORDS.items():
            for keywords in subcategories.values():
                normalized_keywords = [lemmatize_word(k) for k in keywords]
                if word in normalized_keywords:
                    if category_name == "greeting":
                        greeting_detected = True
                        continue

                    return category_name

    if greeting_detected:
        return "greeting"

    return False

def second_level_intent(top_intent, word_list):
    if not top_intent:
        return False

    #if ask about operation/contact info --> just response with predefined shop info
    if top_intent in ["greeting", "operation", "contact"]:
        return top_intent

    #explore sub-intention if asking about services: order, menu
    if top_intent != "service":
        return False

    for word in word_list:
        for subcategory_name, keywords in INTENT_KEYWORDS[top_intent].items():
            normalized_keywords = [lemmatize_word(keyword) for keyword in keywords]
            if word in normalized_keywords:
                return subcategory_name

    return False

#check if the query contains sandwich details (ingredients, size, pickup time when it is being asked),
#return a boolean value that indicating whether the user is placing an order
def has_order_signals(word_list, pending=None):
    if not word_list:
        return False

    if extract_order_items(word_list)[0]:
        return True

    if pending == "pickup_time" and extract_pickup_time(word_list, pending):
        return True

    return False

#extract order detail helper function
def extract_name(word_list, i, word, name_keywords):
    candidate_index = None

    #if the keyword implies that the name is likely to be the next word, check the next word as candidate
    if word in name_keywords["before"] and i + 1 < len(word_list):
        candidate_index = i + 1
    #if the keyword implies that the name is likely to be the previous word, check the previous word as candidate
    elif word in name_keywords["after"] and i + 1 < len(word_list):
        candidate_index = i + 1

    #quit if no candidate index is identified
    if candidate_index is None:
        return ""

    #skip common words that are unlikely to be part of the name
    while candidate_index < len(word_list) and word_list[candidate_index] in NAME_PREFIX_WORDS:
        candidate_index += 1

    #quit if we have reached the end of the word list without finding a valid candidate
    if candidate_index >= len(word_list):
        return ""

    #check if the candidate word is a number or a number word, which are unlikely to be part of the name
    candidate = word_list[candidate_index]
    if candidate.isdigit() or candidate in NUMBER_WORDS:
        return ""

    return candidate.title()


def extract_time(word_list, i, word, time_keywords):
    #check if the word is likely to be the time based on the presence of keywords that typically appear before or after the time in a query
    if word in time_keywords["before"]:
        if i > 0 and is_time_value(word_list[i - 1]):
            return is_time_value(word_list[i - 1:i + 1])
        return ""

    #check if the word is likely to be the time based on the presence of keywords that typically appear before or after the time in a query
    if word in time_keywords["after"]:
        if i + 1 < len(word_list):
            #check "1 pm" before "1" so the am/pm part is not lost
            two_word_time = is_time_value(word_list[i + 1:i + 3])
            if two_word_time:
                return two_word_time

            return is_time_value(word_list[i + 1]) or ""
        else:
            return ""

    #handle special cases where the time is expressed in a more casual way, such as "noon" or "midnight"
    if word in time_keywords["noon"]:
        return word

    #handle cases where the user wants the order as soon as possible
    if word in time_keywords["asap"]:
        return "ASAP"

    #handle special cases where the time is expressed in a more casual way, such as "evening" or "tonight", which are often used to refer to an unclear time in the evening
    if word in time_keywords["unclear"]:
        return "unclear"

    return ""


#flatten the menu items into a single list of (category, item, alias words) and sort them by the number of words
#in their alias in descending order to ensure that we match longer names before shorter ones
def build_menu_aliases():
    menu_items = []

    for category, section_items in MENU_ITEMS.items():
        for item in section_items:
            for alias in item["aliases"]:
                alias_words = alias.lower().split()
                menu_items.append((category, item, alias_words, lemmatize_words(alias_words)))

    menu_items.sort(key=lambda entry: len(entry[2]), reverse=True)
    return menu_items


MENU_ALIASES = build_menu_aliases()


#match the words in query against the ingredient catalog, return the matched ingredients with their position,
#and the set of word positions used by the matches
def extract_order_items(word_list):
    normalized_words = lemmatize_words(word_list)

    matches = []
    used_positions = set()
    i = 0
    while i < len(word_list):
        matched_item = None

        #loop through menu item list to match with the words in query
        for category, item, alias_words, normalized_alias in MENU_ALIASES:
            alias_length = len(alias_words)

            #if the current position in the word list matches the words of a menu item
            if word_list[i:i + alias_length] == alias_words or normalized_words[i:i + alias_length] == normalized_alias:
                matched_item = {"category": category, "name": item["name"], "start": i, "end": i + alias_length}
                break

        #if a menu item is found, record it and move the index forward by the number of words in the matched alias
        #to continue searching for the next item in the query
        if matched_item:
            matches.append(matched_item)
            used_positions.update(range(matched_item["start"], matched_item["end"]))
            i = matched_item["end"]
            continue

        i += 1

    return matches, used_positions


#check whether the words right before position i negate it, e.g. "no onions", "hold the onions", "instead of swiss"
def is_negated(word_list, i):
    j = i - 1
    while j >= 0 and i - j <= 3 and word_list[j] in FILLER_WORDS:
        j -= 1

    if j < 0:
        return False

    if word_list[j] in ORDER_KEYWORDS["negation"]:
        return True

    return word_list[j] in ORDER_KEYWORDS["instead"]


#check whether position i is the item being replaced in "swap swiss for cheddar" / "replace turkey with ham"
def is_swapped_out(word_list, i):
    for j in range(i - 1, max(-1, i - 6), -1):
        if word_list[j] in ORDER_KEYWORDS["swap_target"]:
            return False
        if word_list[j] in ORDER_KEYWORDS["swap"]:
            return True

    return False


def extract_customer_name(word_list, pending):
    name_keywords = ORDER_FIELD_KEYWORDS["name"]

    #look for a name after keywords such as "under", "for", "name"
    for i, word in enumerate(word_list):
        candidate = extract_name(word_list, i, word, name_keywords)
        if candidate and candidate.lower() not in NON_NAME_WORDS and candidate.isalpha():
            return candidate

    #when the chatbot just asked for the name, accept a plain reply such as "Carson" or "it's Carson Chan"
    if pending == "name":
        name_words = [word for word in word_list if word not in NON_NAME_WORDS]
        if name_words and len(name_words) <= 3 and all(word.replace("-", "").replace("'", "").isalpha() for word in name_words):
            return " ".join(word.title() for word in name_words)

    return ""


def extract_pickup_time(word_list, pending):
    time_keywords = ORDER_FIELD_KEYWORDS["time"]

    for i, word in enumerate(word_list):
        pickup_time = extract_time(word_list, i, word, time_keywords)
        if pickup_time:
            return pickup_time

    #when the chatbot just asked for the pickup time, accept a plain reply such as "12:30"
    if pending == "pickup_time":
        for i in range(len(word_list)):
            pickup_time = is_time_value(word_list[i:i + 2]) or is_time_value(word_list[i])
            if pickup_time:
                return pickup_time

    return ""


#apply the details found in the query to the order, return the list of changes for the acknowledgement message
def apply_order_details(word_list, session):
    order = session["order"]
    pending = session["pending"]
    changes = []
    matches, used_positions = extract_order_items(word_list)

    removals = []
    additions = []
    for k, match in enumerate(matches):
        #"no onions or pickles" removes both items
        chained = k > 0 and word_list[match["start"] - 1] in {"or", "nor"} and matches[k - 1] in removals
        if chained or is_negated(word_list, match["start"]) or is_swapped_out(word_list, match["start"]):
            removals.append(match)
        else:
            additions.append(match)

    #category words that are not part of an ingredient name, e.g. "no cheese", "all veggies"
    negated_categories = set()
    mentioned_categories = set()
    for i, word in enumerate(word_list):
        if i in used_positions:
            continue
        for category, keywords in ORDER_KEYWORDS["category"].items():
            if word in keywords:
                mentioned_categories.add(category)
                if is_negated(word_list, i):
                    negated_categories.add(category)

    #"all veggies" / "with everything" / "everything" when the veggies are being asked, but not "lettuce and tomato, that's all"
    phrase = " ".join(word_list)
    wants_all = (
        any(word in ORDER_KEYWORDS["all"] for word in word_list)
        and "veggies" not in negated_categories
        and ("veggies" in mentioned_categories or pending == "veggies" or "with everything" in phrase)
        and not any(match["category"] == "veggies" for match in additions)
    )
    if wants_all:
        order["veggies"] = [item["name"] for item in MENU_ITEMS["veggies"]]
        changes.append("all veggies")

    for match in removals:
        category, name = match["category"], match["name"]
        if category in LIST_FIELDS:
            if order[category] and name in order[category]:
                order[category].remove(name)
                changes.append(f"no {name}")
        elif order[category] == name:
            #ask again for this step unless the user names a replacement in the same sentence
            order[category] = None
            changes.append(f"no {name}")

    for match in additions:
        category, name = match["category"], match["name"]
        if category in LIST_FIELDS:
            if order[category] is None:
                order[category] = []
            if name not in order[category]:
                order[category].append(name)
                changes.append(name)
        elif order[category] != name:
            order[category] = name
            changes.append(name)

    for category in negated_categories & OPTIONAL_FIELDS:
        order[category] = [] if category in LIST_FIELDS else NO_SELECTION
        changes.append(f"no {category}")

    #a plain "no" / "none" / "skip" answers the step that was just asked
    touched_categories = {match["category"] for match in matches} | negated_categories
    if (
        pending in OPTIONAL_FIELDS
        and pending not in touched_categories
        and not (wants_all and pending == "veggies")
        and any(word in ORDER_KEYWORDS["none"] for word in word_list)
    ):
        order[pending] = [] if pending in LIST_FIELDS else NO_SELECTION
        changes.append(f"no {pending}")

    name = extract_customer_name(word_list, pending)
    if name and name != order["name"]:
        order["name"] = name
        changes.append(f"order under {name}")

    pickup_time = extract_pickup_time(word_list, pending)
    if pickup_time == "unclear":
        session["unclear_time"] = pending == "pickup_time"
    elif pickup_time and pickup_time != order["pickup_time"]:
        order["pickup_time"] = pickup_time
        changes.append(f"pickup {format_pickup_time(pickup_time)}")

    return changes


#start a new order from the order intent, details given in the same sentence are recorded right away
def start_order(word_list, session):
    start_new_order(session)
    return continue_order(word_list, session, started=True)


#continue the order with a new message, ask for the next missing step or show the review when everything is filled
def continue_order(word_list, session, started=False):
    phrase = " ".join(word_list)
    if any(keyword in phrase.split() if " " not in keyword else keyword in phrase for keyword in ORDER_KEYWORDS["cancel"]):
        session["status"] = "idle"
        session["pending"] = None
        return "No problem, I've cancelled that order. Let me know whenever you want to start a new one."

    was_confirming = session["status"] == "confirming"
    session["unclear_time"] = False
    changes = apply_order_details(word_list, session)

    #waiting for the user to confirm the review
    if was_confirming and not changes:
        if any(word in ORDER_KEYWORDS["confirm"] for word in word_list) and not any(word in ORDER_KEYWORDS["reject"] for word in word_list):
            return place_order(session)
        if any(word in ORDER_KEYWORDS["reject"] for word in word_list):
            return "No problem, what would you like to change? You can say things like \"swap swiss for cheddar\" or \"no onions\"."
        return f"Sorry, I didn't catch that. {build_order_review(session['order'])}"

    session["pending"] = next_missing_step(session["order"])

    if session["pending"] is None:
        session["status"] = "confirming"
        return build_order_review(session["order"])

    session["status"] = "building"
    if session["unclear_time"]:
        return "Could you give me a specific pickup time, like \"at 12:30\" or \"ASAP\"?"

    if changes:
        return f"Got it: {', '.join(changes)}. {prompt_for_step(session)}"
    if started:
        return f"Great, let's build your sub! {prompt_for_step(session)}"

    return f"Sorry, I didn't catch that. {prompt_for_step(session)}"


def list_options(category):
    return ", ".join(item["name"] for item in MENU_ITEMS[category])


#question asked for each step, listing the available options
def prompt_for_step(session):
    step = session["pending"]

    if step == "bread":
        return f"What bread would you like? We have {list_options('bread')}. And should it be a 6-inch or a Footlong?"
    if step == "size":
        return "Would you like a 6-inch or a Footlong?"
    if step == "protein":
        return f"What meat would you like? We have {list_options('protein')}. You can also say \"no meat\"."
    if step == "cheese":
        return f"Any cheese? We have {list_options('cheese')}, or say \"no cheese\"."
    if step == "veggies":
        return f"Which veggies would you like? We have {list_options('veggies')}. You can say \"all veggies\" or \"no veggies\"."
    if step == "sauce":
        return f"Any sauce? We have {list_options('sauce')}, or say \"no sauce\"."
    if step == "name":
        return "What name should I put the order under?"
    if step == "pickup_time":
        return "When would you like to pick it up? For example \"at 12:30\" or \"ASAP\"."
    if session["status"] == "confirming":
        return build_order_review(session["order"])

    return ""


def format_choice(value):
    if value == NO_SELECTION or value == []:
        return "None"
    if isinstance(value, list):
        return ", ".join(value)
    return value


def format_pickup_time(pickup_time):
    return "as soon as possible" if pickup_time == "ASAP" else f"at {pickup_time}"


#add up the price of every selected ingredient
def calculate_total(order):
    total = 0

    for category, section_items in MENU_ITEMS.items():
        selected = order.get(category)
        selected = selected if isinstance(selected, list) else [selected]
        for item in section_items:
            if item["name"] in selected:
                total += item["price"]

    return round(total, 2)


def build_order_review(order):
    return (
        "Here's your order:\n"
        f"- {format_choice(order['size'])} on {format_choice(order['bread'])}\n"
        f"- Meat: {format_choice(order['protein'])}\n"
        f"- Cheese: {format_choice(order['cheese'])}\n"
        f"- Veggies: {format_choice(order['veggies'])}\n"
        f"- Sauce: {format_choice(order['sauce'])}\n"
        f"- Pickup: {order['name']}, {format_pickup_time(order['pickup_time'])}\n"
        f"Total: ${calculate_total(order):.2f}. Shall I place the order? You can still make changes."
    )


#save the confirmed order and close it
def place_order(session):
    order = session["order"]
    sandwich = {key: value for key, value in order.items() if key not in {"name", "pickup_time"}}
    saved_order = save_order(order["name"], order["pickup_time"], sandwich, calculate_total(order))

    session["status"] = "complete"
    session["pending"] = None
    session["order_id"] = saved_order["id"]

    return (
        f"Your order is placed! Order #{saved_order['id']} for {order['name']} will be ready for pickup "
        f"{format_pickup_time(order['pickup_time'])}. Total: ${saved_order['total']:.2f}. Thank you!"
    )


def build_menu_response():
    return (
        "Here's what you can put in your sub:\n"
        f"- Bread: {list_options('bread')}\n"
        f"- Size: {list_options('size')}\n"
        f"- Meat: {list_options('protein')}\n"
        f"- Cheese: {list_options('cheese')}\n"
        f"- Veggies: {list_options('veggies')}\n"
        f"- Sauce: {list_options('sauce')}"
    )

def is_time_value(text):
    #if time value is expressed in a list of words
    if isinstance(text, list):
        filtered_parts = [part for part in text if part not in {"the", "a", "an"}]
        #filter out common words that are not likely to form a time expression
        if not filtered_parts:
            return False
        text = " ".join(filtered_parts)

    #convert text to lowercase and strip leading/tailing for easier processing
    text = text.lower().strip()

    #case when time is expressed in a simple digit format
    if text.isdigit():
        return text

    #case when time is expressed with am/pm directly attached to the number
    if text.endswith("am") or text.endswith("pm"):
        #only check the part before am/pm
        number_part = text[:-2]
        if number_part.isdigit():
            return text

    #case when time is expressed in a more standard format with ":" separating hour and minute
    parts = text.split()
    #special case when time is expressed with am/pm without space
    if len(parts) == 2 and (parts[0].isdigit() or ":" in parts[0]) and parts[1] in {"am", "pm"}:
        return is_time_value(parts[0]) and f"{parts[0]}{parts[1]}"

    #case when time is expressed in a more standard format with ":"
    parts = text.split(":")
    #check if the time is expressed in valid formats
    if len(parts) == 2:
        hour, minute = parts
        #confirm that both hour and minute part are digits, or the minute part ends with am/pm and the rest are digits
        if hour.isdigit() and minute.isdigit():
            return text
        #case when minute part ends with am/pm
        if minute.endswith("am") or minute.endswith("pm"):
            minute_part = minute[:-2]
            if hour.isdigit() and minute_part.isdigit():
                return text

    return False

def build_guess_message(top_intent, sub_intent):
    if top_intent == "service":
        if sub_intent == "order":
            return "I am guessing you want to order a sandwich."
        if sub_intent == "menu":
            return "I am guessing you want to see the ingredients."

    if top_intent == "contact":
        return "I am guessing you want the shop contact information."
    if top_intent == "operation":
        if sub_intent == "address":
            return "I am guessing you want the shop address."
        if sub_intent == "time":
            return "I am guessing you are asking about the shop hours."
        return "I am guessing you want shop information."
    if top_intent == "greeting":
        return "I am guessing you are greeting the shop."

    return "I am guessing what you want based on what I learned before."

def format_guessed_response(response, top_intent, sub_intent):
    guess_message = build_guess_message(top_intent, sub_intent)

    if isinstance(response, list) and response:
        return [f"{guess_message}\n{response[0]}"] + response[1:]

    if isinstance(response, str):
        return f"{guess_message}\n{response}"

    return response

#generate response based on the extracted intent for
def get_response(original_phrase, intents, guessed_from_learning=False, session=None):
    top_intent, sub_intent = intents
    word_list = parse_phrase(original_phrase)

    #query is asking about service, extract detail
    if "order" in intents:
        if session is None:
            session = get_session()[1]
        response = start_order(word_list, session)
        appending_learning_entry(original_phrase, top_intent, sub_intent)
        return format_guessed_response(response, top_intent, sub_intent) if guessed_from_learning else response
    elif "menu" in intents:
        response = build_menu_response()
        appending_learning_entry(original_phrase, top_intent, sub_intent)
        return format_guessed_response(response, top_intent, sub_intent) if guessed_from_learning else response
    else:
        if top_intent == "greeting":
            response = random.choice(BUSINESS_INFO["greeting"]["responses"])
            appending_learning_entry(original_phrase, top_intent, sub_intent)
            return format_guessed_response(response, top_intent, sub_intent) if guessed_from_learning else response
        elif top_intent == "operation":
            response = BUSINESS_INFO["operation"]["response"]
            appending_learning_entry(original_phrase, top_intent, sub_intent)
            return format_guessed_response(response, top_intent, sub_intent) if guessed_from_learning else response
        elif top_intent == "contact":
            response = BUSINESS_INFO["contact"]["response"]
            appending_learning_entry(original_phrase, top_intent, sub_intent)
            return format_guessed_response(response, top_intent, sub_intent) if guessed_from_learning else response
        else:
            predicted_intents = predict_intent_from_learned_entries(original_phrase)
            if predicted_intents:
                return get_response(original_phrase, predicted_intents, guessed_from_learning=True, session=session)

    return "Sorry, I do not understand that yet."
