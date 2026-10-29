#orders endpoint: list the orders confirmed through the chatbot, newest first
from db.order_store import load_orders


def handle_list_orders(query):
    orders = load_orders()
    orders.reverse()
    return 200, {"orders": orders}
