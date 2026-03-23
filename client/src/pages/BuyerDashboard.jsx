import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { apiRequest, resolveAssetUrl } from "../lib/api.js";
import { useAuth } from "../state/AuthContext.jsx";

const supportEmail = "support@staps.app";

export const ShopperDashboard = () => {
  const { user, refreshUser } = useAuth();
  const [orders, setOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [profileForm, setProfileForm] = useState({
    name: "",
    username: "",
    avatar: null,
  });
  const [reviewForm, setReviewForm] = useState({
    productId: "",
    rating: "5",
    comment: "",
  });
  const [complaintForm, setComplaintForm] = useState({
    orderId: "",
    reason: "Order issue",
    details: "",
  });

  const loadDashboard = async () => {
    const [ordersResponse, notificationsResponse, reviewsResponse] = await Promise.all([
      apiRequest("/api/orders"),
      apiRequest("/api/notifications"),
      apiRequest(`/api/reviews?userId=${user.id}`),
    ]);

    setOrders(ordersResponse.orders || []);
    setNotifications(notificationsResponse.notifications || []);
    setReviews(reviewsResponse.reviews || []);
  };

  useEffect(() => {
    if (!user) {
      return;
    }

    setProfileForm({
      name: user.name || "",
      username: user.username || "",
      avatar: null,
    });

    loadDashboard().catch((requestError) => setError(requestError.message));
  }, [user]);

  const completedOrders = useMemo(
    () => orders.filter((order) => order.status === "completed"),
    [orders],
  );

  const canceledOrders = useMemo(
    () => orders.filter((order) => order.status === "canceled"),
    [orders],
  );

  const activeOrders = useMemo(
    () => orders.filter((order) => !["completed", "canceled"].includes(order.status)),
    [orders],
  );

  const reviewableOrders = useMemo(() => {
    const reviewedProductIds = new Set(reviews.map((review) => review.product?._id || review.product?.id));

    return completedOrders.filter((order) => !reviewedProductIds.has(order.product?._id || order.product?.id));
  }, [completedOrders, reviews]);

  const selectedComplaintOrder = useMemo(
    () => orders.find((order) => order._id === complaintForm.orderId) || null,
    [orders, complaintForm.orderId],
  );

  const complaintMailto = useMemo(() => {
    const subject = complaintForm.orderId
      ? `STAPS complaint for order ${complaintForm.orderId}`
      : "STAPS shopper complaint";

    const lines = [
      `Shopper: ${user?.name || ""}`,
      `Username: @${user?.username || ""}`,
      `Email: ${user?.email || ""}`,
      `Reason: ${complaintForm.reason}`,
      `Order ID: ${selectedComplaintOrder?._id || complaintForm.orderId || "Not selected"}`,
      `Product: ${selectedComplaintOrder?.product?.name || "Not selected"}`,
      "",
      "Complaint details:",
      complaintForm.details || "Please describe the issue here.",
    ];

    return `mailto:${supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
      lines.join("\n"),
    )}`;
  }, [complaintForm, selectedComplaintOrder, user]);

  const confirmDelivery = async (orderId) => {
    try {
      setError("");
      setNotice("");
      const response = await apiRequest(`/api/orders/${orderId}/confirm-delivery`, {
        method: "PATCH",
      });
      setNotice(response.message || "Delivery confirmed successfully.");
      await loadDashboard();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const cancelOrder = async (orderId) => {
    try {
      setError("");
      setNotice("");
      await apiRequest(`/api/orders/${orderId}/cancel`, { method: "PATCH" });
      setNotice("Order canceled successfully.");
      await loadDashboard();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const saveProfile = async (event) => {
    event.preventDefault();

    try {
      const formData = new FormData();
      formData.append("name", profileForm.name);
      formData.append("username", profileForm.username);

      if (profileForm.avatar) {
        formData.append("avatar", profileForm.avatar);
      }

      setError("");
      setNotice("");
      await apiRequest("/api/auth/me", {
        method: "PATCH",
        body: formData,
      });
      await refreshUser();
      setNotice("Profile updated successfully.");
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const submitReview = async (event) => {
    event.preventDefault();

    try {
      setError("");
      setNotice("");
      await apiRequest("/api/reviews", {
        method: "POST",
        body: JSON.stringify(reviewForm),
      });
      setReviewForm({ productId: "", rating: "5", comment: "" });
      setNotice("Review submitted successfully.");
      await loadDashboard();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-5 lg:grid-cols-4">
        {[
          ["Orders placed", String(orders.length)],
          ["Active orders", String(activeOrders.length)],
          ["Completed orders", String(completedOrders.length)],
          ["Canceled orders", String(canceledOrders.length)],
        ].map(([label, value]) => (
          <div key={label} className="surface-card p-5">
            <p className="text-sm text-staps-ink/55">{label}</p>
            <p className="mt-3 font-display text-2xl font-extrabold">{value}</p>
          </div>
        ))}
      </section>

      {(notice || error) && (
        <div className="surface-card p-4 text-sm">
          <span className={error ? "text-red-600" : "text-[#6e54ef]"}>{error || notice}</span>
        </div>
      )}

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <section className="surface-card p-6">
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#6e54ef]">
              Shopper profile
            </p>
            <h1 className="mt-2 font-display text-3xl font-extrabold">Manage your account</h1>
            <p className="mt-2 text-sm text-staps-ink/60">
              Choose a unique username, update your photo, and keep your shopper profile ready for
              vendors you buy from.
            </p>

            <form onSubmit={saveProfile} className="mt-6 grid gap-4">
              <div className="flex items-center gap-4 rounded-[1.6rem] bg-[#f8f9fd] p-4">
                {user?.avatarUrl ? (
                  <img
                    src={resolveAssetUrl(user.avatarUrl)}
                    alt={user.name}
                    className="h-20 w-20 rounded-[1.4rem] object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-[1.4rem] bg-[#eef2ff] font-display text-2xl font-bold text-[#5a49d6]">
                    {(user?.name || "S")
                      .split(" ")
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-staps-ink">{user?.name}</p>
                  <p className="text-sm text-staps-ink/60">@{user?.username || "username"}</p>
                  <p className="mt-1 text-xs text-staps-ink/45">{user?.email}</p>
                </div>
              </div>

              <input
                className="field"
                placeholder="Full name"
                value={profileForm.name}
                onChange={(event) =>
                  setProfileForm((current) => ({ ...current, name: event.target.value }))
                }
              />
              <input
                className="field"
                placeholder="Unique username"
                value={profileForm.username}
                onChange={(event) =>
                  setProfileForm((current) => ({ ...current, username: event.target.value }))
                }
              />
              <label className="field flex cursor-pointer items-center justify-between gap-3">
                <span className="text-staps-ink/70">
                  {profileForm.avatar ? profileForm.avatar.name : "Update profile picture"}
                </span>
                <span className="rounded-full bg-[#eef2ff] px-4 py-2 text-sm font-semibold text-[#5a49d6]">
                  Choose image
                </span>
                <input
                  className="hidden"
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      avatar: event.target.files?.[0] || null,
                    }))
                  }
                />
              </label>
              <button className="primary-button" type="submit">
                Save profile
              </button>
            </form>
          </section>

          <section className="surface-card p-6">
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#6e54ef]">
              Reviews
            </p>
            <h2 className="mt-2 font-display text-2xl font-extrabold">Ratings & reviews</h2>
            <p className="mt-2 text-sm text-staps-ink/60">
              Review completed orders so other shoppers can buy with more confidence.
            </p>

            {reviewableOrders.length ? (
              <form onSubmit={submitReview} className="mt-5 grid gap-4">
                <select
                  className="field"
                  value={reviewForm.productId}
                  onChange={(event) =>
                    setReviewForm((current) => ({ ...current, productId: event.target.value }))
                  }
                >
                  <option value="">Choose a completed order to review</option>
                  {reviewableOrders.map((order) => (
                    <option key={order._id} value={order.product?._id || order.product?.id}>
                      {order.product?.name} by {order.vendor?.name}
                    </option>
                  ))}
                </select>
                <select
                  className="field"
                  value={reviewForm.rating}
                  onChange={(event) =>
                    setReviewForm((current) => ({ ...current, rating: event.target.value }))
                  }
                >
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <option key={rating} value={rating}>
                      {rating} star{rating > 1 ? "s" : ""}
                    </option>
                  ))}
                </select>
                <textarea
                  className="field min-h-24"
                  placeholder="Share a quick note about the product or seller."
                  value={reviewForm.comment}
                  onChange={(event) =>
                    setReviewForm((current) => ({ ...current, comment: event.target.value }))
                  }
                />
                <button className="primary-button" type="submit">
                  Submit review
                </button>
              </form>
            ) : (
              <div className="mt-5 rounded-[1.5rem] bg-[#f8f9fd] p-4 text-sm text-staps-ink/65">
                No completed orders are waiting for a review right now.
              </div>
            )}

            <div className="mt-6 space-y-3">
              {reviews.length ? (
                reviews.map((review) => (
                  <div key={review._id} className="rounded-[1.5rem] border border-staps-ink/8 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-staps-ink">
                          {review.product?.name || "Reviewed product"}
                        </p>
                        <p className="text-sm text-staps-ink/55">
                          Vendor: {review.vendor?.name || "Campus vendor"}
                        </p>
                      </div>
                      <span className="rounded-full bg-[#eef2ff] px-3 py-1 text-sm font-semibold text-[#5a49d6]">
                        {review.rating}/5
                      </span>
                    </div>
                    {review.comment ? (
                      <p className="mt-3 text-sm leading-6 text-staps-ink/70">{review.comment}</p>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="text-sm text-staps-ink/65">Your review history will appear here.</p>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="surface-card p-6">
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#6e54ef]">
              Orders
            </p>
            <h2 className="mt-2 font-display text-2xl font-extrabold">Track your orders</h2>
            <div className="mt-5 space-y-4">
              {[...activeOrders, ...completedOrders].length ? (
                [...activeOrders, ...completedOrders].map((order) => (
                  <div key={order._id} className="rounded-3xl border border-staps-ink/10 p-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-start gap-4">
                        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-[1.35rem] bg-[#f6f8fc]">
                          {order.product?.image || order.product?.images?.[0] ? (
                            <img
                              src={resolveAssetUrl(order.product?.image || order.product?.images?.[0])}
                              alt={order.product?.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-xs font-semibold text-staps-ink/40">
                              Item
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold">{order.product?.name}</h3>
                          <p className="text-sm text-staps-ink/60">
                            Status: {order.status} • Total paid: NGN {order.totalAmount?.toLocaleString()}
                          </p>
                          <p className="text-sm text-staps-ink/60">
                            Quantity: {order.quantity} • Vendor:{" "}
                            {order.vendor?._id ? (
                              <Link
                                to={`/profiles/${order.vendor._id}`}
                                className="font-semibold text-[#5a49d6]"
                              >
                                {order.vendor?.name || "Campus vendor"}
                              </Link>
                            ) : (
                              order.vendor?.name || "Campus vendor"
                            )}
                          </p>
                          <p className="mt-2 text-sm text-staps-ink/60">
                            Delivery: {order.deliveryDetails?.location || "Not set"}
                          </p>
                          <p className="text-sm text-staps-ink/60">
                            {order.deliveryDetails?.address || "No delivery address"}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {order.status === "delivered" && (
                          <button
                            className="primary-button"
                            type="button"
                            onClick={() => confirmDelivery(order._id)}
                          >
                            Confirm delivery
                          </button>
                        )}
                        {["pending", "paid"].includes(order.status) && (
                          <button
                            className="secondary-button"
                            type="button"
                            onClick={() => cancelOrder(order._id)}
                          >
                            Cancel order
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-staps-ink/65">No active or completed orders yet.</p>
              )}
            </div>
          </section>

          <section className="surface-card p-6">
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-red-500">
              Canceled
            </p>
            <h2 className="mt-2 font-display text-2xl font-extrabold">Canceled orders</h2>
            <p className="mt-2 text-sm text-staps-ink/60">
              Keep a clear history of orders you canceled and no longer expect to receive.
            </p>
            <div className="mt-5 space-y-4">
              {canceledOrders.length ? (
                canceledOrders.map((order) => (
                  <div
                    key={order._id}
                    className="rounded-3xl border border-red-200 bg-red-50/70 p-4"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-start gap-4">
                        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-[1.35rem] bg-white">
                          {order.product?.image || order.product?.images?.[0] ? (
                            <img
                              src={resolveAssetUrl(order.product?.image || order.product?.images?.[0])}
                              alt={order.product?.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-xs font-semibold text-staps-ink/40">
                              Item
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold">{order.product?.name}</h3>
                          <p className="text-sm text-red-700">
                            Status: canceled • Total paid: NGN {order.totalAmount?.toLocaleString()}
                          </p>
                          <p className="text-sm text-staps-ink/60">
                            Vendor:{" "}
                            {order.vendor?._id ? (
                              <Link
                                to={`/profiles/${order.vendor._id}`}
                                className="font-semibold text-[#5a49d6]"
                              >
                                {order.vendor?.name || "Campus vendor"}
                              </Link>
                            ) : (
                              order.vendor?.name || "Campus vendor"
                            )}
                          </p>
                          <p className="mt-2 text-sm text-staps-ink/60">
                            Delivery: {order.deliveryDetails?.location || "Not set"}
                          </p>
                          <p className="text-sm text-staps-ink/60">
                            {order.deliveryDetails?.address || "No delivery address"}
                          </p>
                        </div>
                      </div>
                      <div className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-red-600">
                        Order canceled
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-staps-ink/65">You do not have any canceled orders.</p>
              )}
            </div>
          </section>

          <section className="surface-card p-6">
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#6e54ef]">
              Complaint support
            </p>
            <h2 className="mt-2 font-display text-2xl font-extrabold">Draft a complaint email</h2>
            <p className="mt-2 text-sm text-staps-ink/60">
              Fill this form and STAPS will open a drafted support email with your order details.
            </p>

            <div className="mt-5 grid gap-4">
              <select
                className="field"
                value={complaintForm.orderId}
                onChange={(event) =>
                  setComplaintForm((current) => ({ ...current, orderId: event.target.value }))
                }
              >
                <option value="">Select an order</option>
                {orders.map((order) => (
                  <option key={order._id} value={order._id}>
                    {order.product?.name} • {order._id}
                  </option>
                ))}
              </select>
              <select
                className="field"
                value={complaintForm.reason}
                onChange={(event) =>
                  setComplaintForm((current) => ({ ...current, reason: event.target.value }))
                }
              >
                {[
                  "Order issue",
                  "Delivery complaint",
                  "Vendor behaviour",
                  "Payment concern",
                  "Other",
                ].map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
              <textarea
                className="field min-h-28"
                placeholder="Tell STAPS what went wrong."
                value={complaintForm.details}
                onChange={(event) =>
                  setComplaintForm((current) => ({ ...current, details: event.target.value }))
                }
              />
              <a href={complaintMailto} className="primary-button">
                Email support
              </a>
              <p className="text-xs text-staps-ink/50">Support email: {supportEmail}</p>
            </div>
          </section>

          <section className="surface-card p-6">
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#6e54ef]">Alerts</p>
            <h2 className="mt-2 font-display text-2xl font-extrabold">Notifications</h2>
            <div className="mt-5 space-y-3">
              {notifications.length ? (
                notifications.map((notification) => (
                  <div key={notification._id} className="rounded-2xl bg-staps-mist p-4">
                    <p className="font-semibold">{notification.title}</p>
                    <p className="mt-1 text-sm text-staps-ink/65">{notification.message}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-staps-ink/65">No new alerts yet.</p>
              )}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
};
