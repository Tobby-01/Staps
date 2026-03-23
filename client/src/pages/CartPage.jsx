import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { apiRequest, resolveAssetUrl } from "../lib/api.js";
import { useAuth } from "../state/AuthContext.jsx";
import { useCart } from "../state/CartContext.jsx";

export const CartPage = () => {
  const { user } = useAuth();
  const { items, subtotal, removeFromCart, updateQuantity } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [deliveryDetails, setDeliveryDetails] = useState({
    recipientName: "",
    phone: "",
    location: "",
    address: "",
    notes: "",
  });

  useEffect(() => {
    if (user?.name) {
      setDeliveryDetails((current) =>
        current.recipientName ? current : { ...current, recipientName: user.name },
      );
    }
  }, [user]);

  const checkoutItem = async (item) => {
    if (!user) {
      navigate("/login", { state: { from: location } });
      return;
    }

    try {
      setError("");
      setMessage("");
      const response = await apiRequest("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          productId: item._id || item.id,
          quantity: item.quantity,
          deliveryDetails,
        }),
      });

      setMessage("Redirecting to Paystack checkout...");
      window.location.href = response.payment.authorization_url;
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <section className="surface-card p-6">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-staps-orange">Cart</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold">Review your selected items</h1>
        <div className="mt-6 rounded-[1.75rem] bg-[#f8f9fd] p-5">
          <h2 className="font-display text-2xl font-bold">Delivery details</h2>
          <p className="mt-2 text-sm text-staps-ink/55">
            We attach these details to the order and send them to the vendor after payment is
            confirmed.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <input
              className="field"
              placeholder="Recipient name"
              value={deliveryDetails.recipientName}
              onChange={(event) =>
                setDeliveryDetails((current) => ({
                  ...current,
                  recipientName: event.target.value,
                }))
              }
            />
            <input
              className="field"
              placeholder="Phone number"
              value={deliveryDetails.phone}
              onChange={(event) =>
                setDeliveryDetails((current) => ({ ...current, phone: event.target.value }))
              }
            />
            <input
              className="field"
              placeholder="Delivery location"
              value={deliveryDetails.location}
              onChange={(event) =>
                setDeliveryDetails((current) => ({ ...current, location: event.target.value }))
              }
            />
            <input
              className="field"
              placeholder="Hostel, street or pickup address"
              value={deliveryDetails.address}
              onChange={(event) =>
                setDeliveryDetails((current) => ({ ...current, address: event.target.value }))
              }
            />
            <textarea
              className="field min-h-24 md:col-span-2"
              placeholder="Delivery notes (optional)"
              value={deliveryDetails.notes}
              onChange={(event) =>
                setDeliveryDetails((current) => ({ ...current, notes: event.target.value }))
              }
            />
          </div>
        </div>
        <div className="mt-6 space-y-4">
          {items.length ? (
            items.map((item) => (
              <div key={item._id || item.id} className="rounded-3xl border border-staps-ink/10 p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-[#f6f8fc]">
                      {item.image || item.images?.[0] ? (
                        <img
                          src={resolveAssetUrl(item.image || item.images?.[0])}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[0.65rem] font-semibold text-staps-ink/40">
                          Item
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-sm text-staps-ink/60">
                        NGN {Number(item.price).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      className="field w-24"
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(event) =>
                        updateQuantity(item.id || item._id, Number(event.target.value))
                      }
                    />
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => removeFromCart(item.id || item._id)}
                    >
                      Remove
                    </button>
                    <button className="primary-button" type="button" onClick={() => checkoutItem(item)}>
                      Checkout
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-staps-ink/65">Your cart is empty.</p>
          )}
        </div>
      </section>

      <aside className="surface-card p-6">
        <h2 className="font-display text-2xl font-extrabold">Order summary</h2>
        <div className="mt-5 space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span>Items</span>
            <span>{items.length}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Subtotal</span>
            <span>NGN {subtotal.toLocaleString()}</span>
          </div>
        </div>
        <div className="mt-6 rounded-[1.5rem] bg-[#f8f9fd] p-4 text-sm text-staps-ink/70">
          <p className="font-semibold text-staps-ink">Delivery preview</p>
          <p className="mt-2">{deliveryDetails.recipientName || "Recipient name not set yet"}</p>
          <p className="mt-1">{deliveryDetails.phone || "Phone number not set yet"}</p>
          <p className="mt-1">{deliveryDetails.location || "Location not set yet"}</p>
          <p className="mt-1">{deliveryDetails.address || "Address not set yet"}</p>
        </div>
        {(message || error) && (
          <p className={`mt-6 text-sm ${error ? "text-red-600" : "text-staps-orange"}`}>
            {error || message}
          </p>
        )}
      </aside>
    </div>
  );
};
