#this script is responsible for storing the confirmed sandwich orders into a jsonl file,
#which serves as a simple database for the chatbot to retrieve information when needed.
#each order includes an id, the customer name, pickup time, the ingredients of the sandwich, total price
#and created_at timestamp. save_order is called by the chatbot once the user confirms the order review,
#load_orders is used by the API to list saved orders.
#**adapted from booking_store.py of the restaurant chatbot (save_booking / save_delivery)

import json
import uuid
from datetime import datetime
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
ORDER_DATABASE_DIR = BASE_DIR / "data"
ORDER_FILE = ORDER_DATABASE_DIR / "orders.jsonl"


def save_order(name, pickup_time, sandwich, total=0, file_path=ORDER_FILE):
    ORDER_DATABASE_DIR.mkdir(parents=True, exist_ok=True)
    order = {
        "id": uuid.uuid4().hex[:8],
        "name": name,
        "pickup_time": pickup_time,
        "sandwich": sandwich,
        "total": total,
        "created_at": datetime.now().isoformat(timespec="seconds"),
    }

    with open(file_path, "a", encoding="utf-8") as order_file:
        order_file.write(json.dumps(order) + "\n")

    return order


def load_orders(file_path=ORDER_FILE):
    orders = []

    try:
        with open(file_path, "r", encoding="utf-8") as order_file:
            for line in order_file:
                line = line.strip()
                if not line:
                    continue

                try:
                    orders.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
    except FileNotFoundError:
        pass

    return orders
