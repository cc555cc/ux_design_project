# Server

Rule-based ordering chatbot and a small JSON-lines order store. It uses Python's standard library HTTP server, and its only dependency is `nltk`. The chatbot was adapted from the `rule_based_chatbot` restaurant project; see `CHATBOT_CHANGES.md` for what changed and `API.md` for the endpoints.

## Run

```bash
cd server
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python src/app.py          # http://127.0.0.1:8000
```

Optional: install WordNet so the chatbot can match word forms (e.g. "tomatoes" → "tomato"). It still works without it, using the aliases in the menu.

```bash
.venv/bin/python -c "import nltk; nltk.download('wordnet', download_dir='.venv/nltk_data')"
NLTK_DATA=.venv/nltk_data .venv/bin/python src/app.py
```

## Test

```bash
.venv/bin/python -m unittest discover tests
```

## Layout

```
src/
├── app.py                  HTTP server and route table
├── chatbot.py              intent detection and order conversation flow
├── text_normalization.py   lemmatization (nltk WordNet)
├── routes/                 chat, menu, orders endpoint handlers
├── models/order_session.py in-memory order state per chat session
├── db/order_store.py       saves confirmed orders to db/data/orders.jsonl
└── learning_resource/
    ├── response_database.py          keywords, ingredient catalog, shop info
    ├── response_database_minimal.py  baseline copy used to undo learned keywords
    └── model_learning.py             learns unknown words, guesses intents
```

Runtime files, not committed: `src/db/data/orders.jsonl`, `src/learning_resource/learned_interactions.jsonl`, `src/learning_resource/learning_log.txt`.

The learning layer can add learned keywords directly into `response_database.py`. To undo them, copy `response_database_minimal.py` over `response_database.py`.
