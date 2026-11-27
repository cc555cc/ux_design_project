import { useEffect, useState } from "react"
import { useAuth } from "../hook/useAuth"
import {
  fetchOrdersForAccount,
  loadOrderIntoBuilder,
  type SavedOrder,
} from "../data/orderHistory"

function AccountSection() {
  const user = useAuth((state) => state.user)
  const logout = useAuth((state) => state.logout)
  const [orders, setOrders] = useState<SavedOrder[]>([])
  const [loadingOrders, setLoadingOrders] = useState(true)

  useEffect(() => {
    if (!user) {
      window.location.replace("#login")
      return
    }

    let cancelled = false
    fetchOrdersForAccount(user.id).then((results) => {
      if (!cancelled) {
        setOrders(results)
        setLoadingOrders(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [user])

  if (!user) {
    return null
  }

  const latestOrder = orders[0] ?? null

  const handleLogout = () => {
    logout()
    window.location.hash = "#login"
  }

  const handleOrderPrevious = (order: SavedOrder) => {
    loadOrderIntoBuilder(order, user.id)
  }

  return (
    <section id="accountPage" className="min-h-dvh bg-gray-50 px-6 pt-[15vh] pb-12">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="rounded-2xl bg-white p-8 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="font-gasoek text-3xl text-[#D62828]">Account</h1>
              <p className="mt-2 text-xl font-medium text-gray-900">@{user.username}</p>
              {user.email ? <p className="text-base text-gray-600">{user.email}</p> : null}
              <p className="text-sm text-gray-500">Account ID: {user.id}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={!latestOrder}
                onClick={() => latestOrder && handleOrderPrevious(latestOrder)}
                className={`rounded-xl px-5 py-2.5 font-gasoek text-base transition ${
                  latestOrder
                    ? "cursor-pointer bg-[#D62828] text-white hover:bg-red-700"
                    : "cursor-not-allowed bg-gray-200 text-gray-500"
                }`}
              >
                Order Previous
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="cursor-pointer rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-base font-semibold text-gray-800 transition hover:border-[#D62828] hover:text-[#D62828]"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-sm">
          <h2 className="font-gasoek text-2xl text-gray-900">Previous Orders</h2>

          {loadingOrders ? (
            <p className="mt-4 text-base text-gray-500">Loading your previous orders...</p>
          ) : orders.length === 0 ? (
            <div className="mt-4 rounded-xl bg-gray-50 p-6 text-center">
              <p className="text-base text-gray-600">
                You haven&apos;t placed an order on this account yet.
              </p>
              <a
                href="#order"
                className="mt-4 inline-block rounded-xl bg-[#D62828] px-5 py-2.5 font-gasoek text-base text-white transition hover:bg-red-700"
              >
                Start Your First Order
              </a>
            </div>
          ) : (
            <ul className="mt-4 space-y-4">
              {orders.map((order) => (
                <li
                  key={order.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-200 p-4"
                >
                  <div className="space-y-1">
                    {order.items.map((item) => (
                      <p key={item.id} className="font-medium text-gray-900">
                        {item.quantity}x {item.size} — {item.summary}
                      </p>
                    ))}
                    <p className="text-sm text-gray-500">
                      Pickup: {order.pickupName || "—"}
                      {order.pickupTime ? ` at ${order.pickupTime}` : ""} · $
                      {order.total.toFixed(2)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOrderPrevious(order)}
                    className="cursor-pointer rounded-xl bg-[#D62828] px-4 py-2 font-gasoek text-base text-white transition hover:bg-red-700"
                  >
                    Order Previous
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}

export default AccountSection
