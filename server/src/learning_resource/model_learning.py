#this script is responsible for storing unrecognized user input and corresponding extracted intents 
#for future model traning and improvement
from datetime import datetime
import json
from pathlib import Path
import ast
import sys

CURRENT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = CURRENT_DIR.parent

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from learning_resource.response_database import STOP_WORDS,INTENT_KEYWORDS
from text_normalization import lemmatize_word

BASE_DIR = CURRENT_DIR
RESPONSE_DATABASE_FILE = BASE_DIR / "response_database.py"

def load_learned_entries():
    learned_entries = []

    try:
        with open(LEARNED_INTERACTIONS_FILE, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue

                try:
                    entry = json.loads(line)
                    entry.setdefault("observation", 0)
                    learned_entries.append(entry)
                except json.JSONDecodeError:
                    continue
    except FileNotFoundError:
        pass

    return learned_entries

LEARNED_INTERACTIONS_FILE = BASE_DIR / "learned_interactions.jsonl"
LEARNING_LOG_FILE = BASE_DIR / "learning_log.txt"
NON_LEARNABLE_TOP_INTENTS = {"greeting"}

KNOWN_INTENT_WORDS = {
    lemmatize_word(keyword)
    for category in INTENT_KEYWORDS.values()
    for keyword_list in category.values()
    for keyword in keyword_list
}

KNOWN_INTENT_TOKENS = {
    token
    for keyword in KNOWN_INTENT_WORDS
    for token in keyword.lower().split()
}

def normalize_learning_tokens(words):
    
    normalize_tokens = []

    for word in words:
        word = word.lower().strip('.,!?()[]{}"\'')

        if word.isdigit():
            normalize_tokens.append("<number>")
            continue
        elif word in STOP_WORDS:
            continue
        else: 
            normalize_tokens.append(lemmatize_word(word))
    
    return normalize_tokens

def learning_candidates_from_phrase(phrase):
    return normalize_learning_tokens(parse_learning_phrase(phrase))

def parse_learning_phrase(phrase):
    parse_list = []

    for word in phrase.lower().split():
        cleaned_word = word.strip(".,!?;:").replace(".", "")
        if cleaned_word:
            parse_list.append(cleaned_word)

    return parse_list

def write_learning_log(word, original_phrase, top_intent, sub_intent, action="learned"):
    log_message = (
        f"{action.capitalize()} word: {word} | phrase: {original_phrase} | "
        f"top_intent: {top_intent} | sub_intent: {sub_intent}"
    )

    with open(LEARNING_LOG_FILE, "a", encoding="utf-8") as f:
        f.write(log_message + "\n")

#called by chatbot.py to learn unrecognized word
def appending_learning_entry(original_phrase, top_intent, sub_intent):
    parsed_phrase = learning_candidates_from_phrase(original_phrase)
    has_known_intent_word = any(word in KNOWN_INTENT_TOKENS for word in parsed_phrase)
    normalized_phrase = learning_candidates_from_phrase(original_phrase)
    learned_entries = load_learned_entries()

    if not top_intent:
        return

    #keep greeting detection hand-curated so unrelated phrases do not pollute it.
    if top_intent in NON_LEARNABLE_TOP_INTENTS:
        return

    if top_intent != "service":
        sub_intent = False

    #iterate through the normalized word list, check if each word is a known
    #intent word, or has been registerd in the learned interaction file
    for word in normalized_phrase:
        if word not in KNOWN_INTENT_WORDS and word != "<number>":
            #check if the word is registerd in the learned interaction file, where "word" equal to the current word
            unrecognized_word_entry = None
            for entry in learned_entries:
                if entry["word"] == word:
                    unrecognized_word_entry = entry
                    break
        else:
            continue
        
        #if this word is registered, then updates the points of the associated intents in the entry
        if unrecognized_word_entry is not None:
            if top_intent not in unrecognized_word_entry["top_intent"]:
                unrecognized_word_entry["top_intent"][top_intent] = 1
            else:
                unrecognized_word_entry["top_intent"][top_intent] += 1

            if sub_intent:
                if sub_intent not in unrecognized_word_entry["sub_intent"]:
                    unrecognized_word_entry["sub_intent"][sub_intent] = 1
                else:
                    unrecognized_word_entry["sub_intent"][sub_intent] += 1
            if has_known_intent_word:
                unrecognized_word_entry["observation"] += 1
            unrecognized_word_entry["updated_at"] = datetime.now().isoformat(timespec="seconds")
            write_learning_log(word, original_phrase, top_intent, sub_intent, action="updated")

            #after updating the intent points, check whether the word mature enough to be added to the response database for faster access in the future
            #mature threshold is 5 or more observation count, an intent has over 70% apperance in the associated intents
            if unrecognized_word_entry["observation"] >= 5:
                total_top_points = sum(unrecognized_word_entry["top_intent"].values())
                #check each top_intent nominant and see if any of them has over 70% association with the word
                for intent, points in unrecognized_word_entry["top_intent"].items():
                    if total_top_points and points / total_top_points >= 0.7:
                        #if word to be promoted belong in "service", get the corresponding sub_intent
                        if intent == "service":
                            total_sub_points = sum(unrecognized_word_entry["sub_intent"].values())
                            for sub_intent, sub_points in unrecognized_word_entry["sub_intent"].items():
                                if total_sub_points and sub_points / total_sub_points >= 0.7:
                                    write_to_response_database(word, intent, sub_intent)
                                    write_learning_log(word, original_phrase, intent, sub_intent, action="promoted")
                                    learned_entries.remove(unrecognized_word_entry)
                                    with open(LEARNED_INTERACTIONS_FILE, "w", encoding="utf-8") as f:
                                        for entry in learned_entries:
                                            f.write(json.dumps(entry) + "\n")
                                    return False
                        else: #promoted word belongs to non-service category, simply add them to corresponding bucket without sub_intent consideration
                            write_to_response_database(word, intent, False)
                            write_learning_log(word, original_phrase, intent, False, action="promoted")
                            learned_entries.remove(unrecognized_word_entry)
                            with open(LEARNED_INTERACTIONS_FILE, "w", encoding="utf-8") as f:
                                for entry in learned_entries:
                                    f.write(json.dumps(entry) + "\n")
                            return False

        else: #the new word has not been registered
            #returns a json entry of the new word
            unrecognized_word_entry = add_new_keyword(
                word,
                top_intent,
                sub_intent,
                observation=1 if has_known_intent_word else 0,
            )
            learned_entries.append(unrecognized_word_entry)
            write_learning_log(word, original_phrase, top_intent, sub_intent, action="learned")

    with open(LEARNED_INTERACTIONS_FILE, "w", encoding="utf-8") as f:
        for entry in learned_entries:
            f.write(json.dumps(entry) + "\n")


def add_new_keyword(word, top_intent, sub_intent, observation=0):
    associated_top_intent = {}
    associated_sub_intent = {}

    associated_top_intent[top_intent] = 1

    if top_intent == "service" and sub_intent:
        associated_sub_intent[sub_intent] = 1
    
    json_entry = {
        "word": word,
        "top_intent": associated_top_intent,
        "sub_intent": associated_sub_intent,
        "observation": observation,
        "updated_at": datetime.now().isoformat(timespec="seconds"),
    }

    return json_entry

def predict_intent_from_learned_entries(current_phrase):
    normalized_phrase = learning_candidates_from_phrase(current_phrase)
    associated_top_intent_points = {}
    associated_sub_intent_points = {}
    learned_entries = load_learned_entries()
    
    for word in normalized_phrase:
        for entry in learned_entries:
            if entry["word"] == word:
                for intent, points in entry["top_intent"].items():
                    if intent in associated_top_intent_points:
                        associated_top_intent_points[intent] += points
                    else:
                        associated_top_intent_points[intent] = points

                for intent, points in entry["sub_intent"].items():
                    if intent in associated_sub_intent_points:
                        associated_sub_intent_points[intent] += points
                    else:
                        associated_sub_intent_points[intent] = points

    #if there are associated intent points, check if any top intent has over 70% association with the phrase
    if associated_top_intent_points:
        #exclude non-learnable top intents from consideration
        for intent in NON_LEARNABLE_TOP_INTENTS:
            associated_top_intent_points.pop(intent, None)
        
        if not associated_top_intent_points:
            return False    

        predicted_top_intent = max(associated_top_intent_points, key=associated_top_intent_points.get)

        #if "service" is the winner, also check if there is a sub intent that has over 70% association with the phrase within the "service" category
        if predicted_top_intent == "service" and associated_sub_intent_points:
            predicted_sub_intent = max(associated_sub_intent_points, key=associated_sub_intent_points.get)
        else:
            predicted_sub_intent = False

        #return set of intents for another round of response generation
        return [predicted_top_intent, predicted_sub_intent]

    return False

def train(sentence, top_intent, sub_intent=False):
    if top_intent != "service":
        sub_intent = False

    appending_learning_entry(sentence, top_intent, sub_intent)
        
    return {
        "sentence": sentence,
        "top_intent": top_intent,
        "sub_intent": sub_intent,
        "status": "trained",
    }

def write_to_response_database(word, top_intent, sub_intent):
    target_top_intent = top_intent
    target_sub_intent = sub_intent

    if top_intent == "greeting":
        target_sub_intent = "message"
    elif top_intent == "contact" and not sub_intent:
        target_sub_intent = max(INTENT_KEYWORDS["contact"], key=lambda key: len(INTENT_KEYWORDS["contact"][key]))
    elif top_intent == "operation" and not sub_intent:
        target_sub_intent = max(INTENT_KEYWORDS["operation"], key=lambda key: len(INTENT_KEYWORDS["operation"][key]))

    keyword_bucket = INTENT_KEYWORDS[target_top_intent].setdefault(target_sub_intent, [])
    if word not in keyword_bucket:
        keyword_bucket.append(word)

        with open(RESPONSE_DATABASE_FILE, "r", encoding="utf-8") as f:
            file_text = f.read()

        keyword_tree = ast.literal_eval(
            file_text.split("INTENT_KEYWORDS = ", 1)[1].split("\n\nSTOP_WORDS =", 1)[0]
        )

        db_bucket = keyword_tree[target_top_intent].setdefault(target_sub_intent, [])
        if word not in db_bucket:
            db_bucket.append(word)

            old_block = "INTENT_KEYWORDS = " + file_text.split("INTENT_KEYWORDS = ", 1)[1].split("\n\nSTOP_WORDS =", 1)[0]
            new_block = "INTENT_KEYWORDS = " + repr(keyword_tree)
            file_text = file_text.replace(old_block, new_block, 1)

            with open(RESPONSE_DATABASE_FILE, "w", encoding="utf-8") as f:
                f.write(file_text)

    return 0

#generated by codex:
#read training file and call train function for each entry to update the learned interaction file and response database accordingly.
if __name__ == "__main__":
    from chatbot import get_intent

    training_files = ("training_sentences.txt",)
    trained_count = 0
    skipped_count = 0
    training_file = None

    for candidate in training_files:
        try:
            with open(candidate, "r", encoding="utf-8"):
                training_file = candidate
                break
        except FileNotFoundError:
            continue

    if training_file is None:
        print("No training file found. Expected training_sentences.txt")
    else:
        with open(training_file, "r", encoding="utf-8") as f:
            for raw_line in f:
                line = raw_line.strip()
                if not line or line.startswith("#"):
                    continue

                sentence = None
                top_intent = None
                sub_intent = False

                try:
                    entry = json.loads(line)
                except json.JSONDecodeError:
                    entry = None

                if isinstance(entry, dict):
                    sentence = entry.get("sentence")
                    top_intent = entry.get("top_intent")
                    sub_intent = entry.get("sub_intent", False)
                else:
                    delimiter = "\t" if "\t" in line else "|" if "|" in line else None
                    if delimiter:
                        parts = [part.strip() for part in line.split(delimiter)]
                        if len(parts) >= 2:
                            sentence = parts[0]
                            top_intent = parts[1]
                            if len(parts) >= 3 and parts[2]:
                                sub_intent = parts[2]
                    else:
                        sentence = line
                        top_intent, sub_intent = get_intent(sentence)

                if sentence and top_intent:
                    train(sentence, top_intent, sub_intent)
                    trained_count += 1
                else:
                    skipped_count += 1

        print(f"Training complete from {training_file}: trained={trained_count}, skipped={skipped_count}")

