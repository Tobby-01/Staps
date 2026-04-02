import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { apiRequest, resolveAssetUrl } from "../lib/api.js";
import {
  formatNaira,
  getCartItemSubtotal,
  getCartItemTotal,
  getProductActivePrice,
  getProductDeliveryFee,
} from "../lib/marketplace.js";
import { useAuth } from "../state/AuthContext.jsx";
import { useCart } from "../state/CartContext.jsx";

export const CartPage = () => {
  const { user, refreshUser } = useAuth();
  const { items, subtotal, deliveryTotal, grandTotal, removeFromCart, updateQuantity } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [checkoutPending, setCheckoutPending] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("wallet");
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

  const checkoutItems = async (selectedItems) => {
    if (!user) {
      navigate("/login", { state: { from: location } });
      return;
    }

    if (!selectedItems.length) {
      setError("Your cart is empty.");
      return;
    }

    try {
      setCheckoutPending(true);
      setError("");
      setMessage("");
      const response = await apiRequest("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          items: selectedItems.map((item) => ({
            productId: item._id || item.id,
            quantity: item.quantity,
          })),
          deliveryDetails,
          paymentMethod,
        }),
      });

      if (paymentMethod === "wallet") {
        selectedItems.forEach((item) => removeFromCart(item.id || item._id));
        await refreshUser();
        setMessage(
          response.message ||
            (selectedItems.length > 1
              ? "Orders paid from wallet successfully."
              : "Order paid from wallet successfully."),
        );
        return;
      }

      setMessage(
        selectedItems.length > 1
          ? "Redirecting to Paystack checkout for all selected items..."
          : "Redirecting to Paystack checkout...",
      );
      window.location.href = response.payment.authorization_url;
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setCheckoutPending(false);
    }
  };

  const walletBalance = Math.max(0, Math.round(Number(user?.walletBalance || 0)));
  const hasEnoughWalletBalance = walletBalance >= Math.round(Number(grandTotal || 0));

  if (user?.role === "vendor") {
    return (
      <div className="mx-auto max-w-3xl surface-card p-6">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#6e54ef]">Vendor workspace</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold">Vendor accounts cannot checkout</h1>
        <p className="mt-3 text-sm leading-6 text-staps-ink/65">
          Your vendor account is reserved for monitoring orders, processing shipments, payout setup,
          and managing listings. To shop on STAPS, create a separate shopper profile.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link to="/vendor" className="secondary-button text-center">
            Go to vendor dashboard
          </Link>
          <Link to="/signup" className="primary-button text-center">
            Shop now
          </Link>
        </div>
      </div>
    );
  }

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
        <div className="mt-6 rounded-[1.75rem] border border-staps-ink/10 bg-white p-5">
          <h2 className="font-display text-2xl font-bold">Payment method</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setPaymentMethod("wallet")}
              className={`rounded-2xl border px-4 py-4 text-left transition ${
                paymentMethod === "wallet"
                  ? "border-transparent bg-[#6e54ef] text-white shadow-lg shadow-[#6e54ef]/25"
                  : "border-staps-ink/10 bg-white text-staps-ink"
              }`}
            >
              <p className="text-sm font-bold uppercase tracking-[0.18em]">
                Wallet
              </p>
              <p className="mt-2 text-xl font-extrabold">
                NGN {formatNaira(walletBalance)}
              </p>
              <p className={`mt-1 text-sm ${paymentMethod === "wallet" ? "text-white/85" : "text-staps-ink/60"}`}>
                {hasEnoughWalletBalance ? "Ready for this checkout" : "Insufficient wallet balance"}
              </p>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod("paystack")}
              className={`rounded-2xl border px-4 py-4 text-left transition ${
                paymentMethod === "paystack"
                  ? "border-transparent bg-[#ea6b2d] text-white shadow-lg shadow-[#ea6b2d]/25"
                  : "border-staps-ink/10 bg-white text-staps-ink"
              }`}
            >
              <p className="text-sm font-bold uppercase tracking-[0.18em]">Paystack</p>
              <p className="mt-2 text-xl font-extrabold">Card / Transfer</p>
              <p className={`mt-1 text-sm ${paymentMethod === "paystack" ? "text-white/85" : "text-staps-ink/60"}`}>
                Secure gateway checkout
              </p>
            </button>
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
                        NGN {formatNaira(getProductActivePrice(item))}
                      </p>
                      <p className="text-xs text-staps-ink/50">
                        Delivery fee: NGN {formatNaira(getProductDeliveryFee(item))}
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
                      disabled={checkoutPending}
                    >
                      Remove
                    </button>
                    <button
                      className="primary-button"
                      type="button"
                      onClick={() => checkoutItems([item])}
                      disabled={checkoutPending}
                    >
                      Checkout this item
                    </button>
                  </div>
                </div>
                <div className="mt-4 grid gap-2 rounded-[1.35rem] bg-[#f8f9fd] px-4 py-3 text-sm text-staps-ink/68 sm:grid-cols-3">
                  <div className="flex items-center justify-between gap-3 sm:block">
                    <span>Items total</span>
                    <span className="font-semibold text-staps-ink">
                      NGN {formatNaira(getCartItemSubtotal(item))}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:block">
                    <span>Delivery</span>
                    <span className="font-semibold text-staps-ink">
                      NGN {formatNaira(getProductDeliveryFee(item))}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:block">
                    <span>Checkout total</span>
                    <span className="font-semibold text-staps-ink">
                      NGN {formatNaira(getCartItemTotal(item))}
                    </span>
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
            <span>NGN {formatNaira(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Estimated delivery</span>
            <span>NGN {formatNaira(deliveryTotal)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-staps-ink/10 pt-3 font-semibold text-staps-ink">
            <span>Total payable</span>
            <span>NGN {formatNaira(grandTotal)}</span>
          </div>
        </div>
        <div className="mt-6 rounded-[1.5rem] bg-[#f8f9fd] p-4 text-sm text-staps-ink/70">
          <p className="font-semibold text-staps-ink">Delivery preview</p>
          <p className="mt-2">{deliveryDetails.recipientName || "Recipient name not set yet"}</p>
          <p className="mt-1">{deliveryDetails.phone || "Phone number not set yet"}</p>
          <p className="mt-1">{deliveryDetails.location || "Location not set yet"}</p>
          <p className="mt-1">{deliveryDetails.address || "Address not set yet"}</p>
          <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[#6e54ef]">
            One payment, separate vendor notifications
          </p>
        </div>
        <button
          className="primary-button mt-6 w-full"
          type="button"
          onClick={() => checkoutItems(items)}
          disabled={!items.length || checkoutPending || (paymentMethod === "wallet" && !hasEnoughWalletBalance)}
        >
          {checkoutPending
            ? "Preparing checkout..."
            : paymentMethod === "wallet"
              ? `Pay from wallet (${items.length})`
              : `Checkout all items (${items.length})`}
        </button>
        {(message || error) && (
          <p className={`mt-6 text-sm ${error ? "text-red-600" : "text-staps-orange"}`}>
            {error || message}
          </p>
        )}
      </aside>
    </div>
  );
};
