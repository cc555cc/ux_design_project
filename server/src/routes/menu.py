#menu endpoint: the ingredient catalog grouped by build step, used by the frontend to draw sandwich layers
from learning_resource.response_database import MENU_ITEMS
from models.order_session import ORDER_STEPS


def handle_menu(query):
    return 200, {
        "steps": ORDER_STEPS,
        "categories": {
            category: [{"name": item["name"], "price": item["price"]} for item in items]
            for category, items in MENU_ITEMS.items()
        },
    }
