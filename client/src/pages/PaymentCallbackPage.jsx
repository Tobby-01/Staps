import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { apiRequest } from "../lib/api.js";
import { useAuth } from "../state/AuthContext.jsx";
import { useCart } from "../state/CartContext.jsx";

export const PaymentCallbackPage = () => {
  const { refreshUser } = useAuth();
  const { removeFromCart } = useCart();
  const [searchParams] = useSearchParams();
  const hasVerifiedPayment = useRef(false);
  const [status, setStatus] = useState({
    title: "Checkout status",
    message: "Verifying payment...",
    intent: "",
    error: false,
  });

  useEffect(() => {
    if (hasVerifiedPayment.current) {
      return;
    }

    const reference = searchParams.get("reference");
    if (!reference) {
      setStatus({
        title: "Payment callback",
        message: "Missing payment reference.",
        intent: "",
        error: true,
      });
      return;
    }

    hasVerifiedPayment.current = true;

    apiRequest(`/api/payments/verify/${reference}`)
      .then(async (response) => {
        await refreshUser();

        if (response.intent === "order_payment") {
          const paidOrders = Array.isArray(response.orders)
            ? response.orders
            : response.order
              ? [response.order]
              : [];

          paidOrders.forEach((order) => {
            if (order?.product) {
              removeFromCart(order.product);
            }
          });
        }

        setStatus({
          title:
            response.intent === "vendor_registration" ? "Vendor payment confirmed" : "Payment confirmed",
          message: response.message,
          intent: response.intent,
          error: false,
        });
      })
      .catch((error) =>
        setStatus({
          title: "Payment callback",
          message: error.message,
          intent: "",
          error: true,
        }),
      );
  }, [refreshUser, removeFromCart, searchParams]);

  return (
    <div className="mx-auto max-w-2xl surface-card p-8">
      <p className="text-sm font-bold uppercase tracking-[0.25em] text-staps-orange">
        Payment callback
      </p>
      <h1 className="mt-2 font-display text-3xl font-extrabold">{status.title}</h1>
      <p className={`mt-4 ${status.error ? "text-red-600" : "text-staps-ink/70"}`}>{status.message}</p>
      {!status.error && status.intent === "order_payment" ? (
        <Link to="/dashboard" className="mt-6 inline-flex secondary-button">
          View your orders
        </Link>
      ) : null}
      {!status.error && status.intent === "vendor_registration" ? (
        <Link to="/vendor" className="mt-6 inline-flex secondary-button">
          Go to vendor dashboard
        </Link>
      ) : null}
    </div>
  );
};
