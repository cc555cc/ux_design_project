#orders endpoint: list the orders confirmed through the chatbot, newest first
from db.order_store import load_orders


def handle_list_orders(query):
    orders = load_orders()
    account_id = query.get("account_id")
    if account_id:
        orders = [order for order in orders if order.get("account_id") == account_id]
    orders.reverse()
    return 200, {"orders": orders}
