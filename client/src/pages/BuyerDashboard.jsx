import { CameraIcon, StarIcon as StarOutlineIcon } from "@heroicons/react/24/outline";
import { StarIcon as StarSolidIcon } from "@heroicons/react/24/solid";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { SwipeableNotificationCard } from "../components/SwipeableNotificationCard.jsx";
import { apiRequest, resolveAssetUrl } from "../lib/api.js";
import { useAuth } from "../state/AuthContext.jsx";

const supportEmail = "stapdevs@gmail.com";
const dashboardRefreshIntervalMs = 5000;
const notificationTimeFormatter = new Intl.DateTimeFormat("en-NG", {
  dateStyle: "medium",
  timeStyle: "short",
});

const formatNotificationTime = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return notificationTimeFormatter.format(date);
};

const formatWalletAmount = (value) => Number(value || 0).toLocaleString();

export const ShopperDashboard = () => {
  const { user, refreshUser } = useAuth();
  const [orders, setOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [wallet, setWallet] = useState({
    balance: 0,
    currency: "NGN",
    fundingAccount: null,
    transactions: [],
  });
  const [walletFundAmount, setWalletFundAmount] = useState("2000");
  const [walletFunding, setWalletFunding] = useState(false);
  const [walletFundingAccountBusy, setWalletFundingAccountBusy] = useState(false);
  const [walletFundingAccountUnavailable, setWalletFundingAccountUnavailable] = useState(false);
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
  const [deletingNotificationId, setDeletingNotificationId] = useState("");

  const loadDashboard = async ({ silent = false } = {}) => {
    try {
      const [ordersResponse, notificationsResponse, reviewsResponse, conversationsResponse, walletResponse] =
        await Promise.all([
          apiRequest("/api/orders"),
          apiRequest("/api/notifications"),
          apiRequest(`/api/reviews?userId=${user.id}`),
          apiRequest("/api/chat/conversations"),
          apiRequest("/api/wallet"),
        ]);

      setOrders(ordersResponse.orders || []);
      setNotifications(notificationsResponse.notifications || []);
      setReviews(reviewsResponse.reviews || []);
      setConversations(conversationsResponse.conversations || []);
      setWallet(
        walletResponse.wallet || { balance: 0, currency: "NGN", fundingAccount: null, transactions: [] },
      );
      setError("");
    } catch (requestError) {
      if (!silent) {
        throw requestError;
      }
    }
  };

  useEffect(() => {
    if (!user) {
      return;
    }

    let active = true;

    setProfileForm({
      name: user.name || "",
      username: user.username || "",
      avatar: null,
    });

    loadDashboard().catch((requestError) => {
      if (active) {
        setError(requestError.message);
      }
    });

    const refreshDashboard = () => {
      if (!active) {
        return;
      }

      loadDashboard({ silent: true }).catch(() => {});
    };

    const intervalId = window.setInterval(refreshDashboard, dashboardRefreshIntervalMs);
    const handleWindowFocus = () => refreshDashboard();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshDashboard();
      }
    };

    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
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

  const renderRatingStars = (rating, { interactive = false, onSelect } = {}) => (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((value) => {
        const active = value <= Number(rating || 0);
        const Icon = active ? StarSolidIcon : StarOutlineIcon;

        if (!interactive) {
          return (
            <Icon
              key={value}
              className={`h-5 w-5 ${active ? "text-[#f4b63d]" : "text-staps-ink/18"}`}
            />
          );
        }

        return (
          <button
            key={value}
            type="button"
            onClick={() => onSelect?.(value)}
            className="rounded-full p-1 transition hover:scale-[1.04]"
            aria-label={`Rate ${value} star${value === 1 ? "" : "s"}`}
          >
            <Icon
              className={`h-7 w-7 ${active ? "text-[#f4b63d]" : "text-staps-ink/18"}`}
            />
          </button>
        );
      })}
    </div>
  );

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

  const dismissNotification = async (notificationId) => {
    const previousNotifications = notifications;

    try {
      setDeletingNotificationId(notificationId);
      setNotifications((current) =>
        current.filter((notification) => notification._id !== notificationId),
      );
      await apiRequest(`/api/notifications/${notificationId}`, {
        method: "DELETE",
      });
    } catch (requestError) {
      setNotifications(previousNotifications);
      setError(requestError.message);
    } finally {
      setDeletingNotificationId("");
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

  const initializeWalletFunding = async (event) => {
    event.preventDefault();

    try {
      setWalletFunding(true);
      setError("");
      setNotice("");
      const response = await apiRequest("/api/wallet/fund/initialize", {
        method: "POST",
        body: JSON.stringify({ amount: walletFundAmount }),
      });

      setNotice("Redirecting to Paystack to fund your wallet...");
      window.location.href = response.payment.authorization_url;
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setWalletFunding(false);
    }
  };

  const provisionWalletFundingAccount = async () => {
    try {
      setWalletFundingAccountBusy(true);
      setError("");
      setNotice("");
      const response = await apiRequest("/api/wallet/fund/account", {
        method: "POST",
      });

      if (response.fundingAccount) {
        setWallet((current) => ({
          ...current,
          fundingAccount: response.fundingAccount,
        }));
        setWalletFundingAccountUnavailable(false);
      }

      setNotice(response.message || "Personal wallet funding account is ready.");
    } catch (requestError) {
      if (String(requestError.message || "").includes("/api/wallet/fund/account")) {
        setError(
          "Personal funding account setup is not live on this server yet. Please use 'Fund now' for now and redeploy the latest backend.",
        );
        return;
      }

      if (
        /personal funding accounts are not enabled|dedicated\s*nuban\s+is\s+not\s+available/i.test(
          String(requestError.message || ""),
        )
      ) {
        setWalletFundingAccountUnavailable(true);
        setError(
          "Personal funding account is not enabled on your Paystack profile yet. You can still fund wallet with the 'Fund now' button.",
        );
        return;
      }

      setError(requestError.message);
    } finally {
      setWalletFundingAccountBusy(false);
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
      <section className="surface-card p-3.5 md:p-5">
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-4">
          {[
            ["Orders placed", String(orders.length)],
            ["Active orders", String(activeOrders.length)],
            ["Completed orders", String(completedOrders.length)],
            ["Canceled orders", String(canceledOrders.length)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-[1.35rem] bg-[#f8f9fd] px-3.5 py-3 md:px-4 md:py-4">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-staps-ink/45 md:text-sm md:normal-case md:tracking-normal">
                {label}
              </p>
              <p className="mt-2 font-display text-[1.35rem] font-extrabold leading-none md:mt-3 md:text-2xl">
                {value}
              </p>
            </div>
          ))}
        </div>
      </section>

      {(notice || error) && (
        <div className="surface-card p-4 text-sm">
          <span className={error ? "text-red-600" : "text-[#6e54ef]"}>{error || notice}</span>
        </div>
      )}

      <section id="wallet" className="surface-card scroll-mt-28 p-6">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#6e54ef]">
          Wallet
        </p>
        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="font-display text-2xl font-extrabold">Your balance</h2>
            <p className="mt-2 text-sm text-staps-ink/60">
              Fund with Paystack and use wallet balance for fast checkout. Refunds from canceled paid
              orders are credited here.
            </p>
            <p className="mt-4 font-display text-4xl font-extrabold text-staps-ink">
              {wallet.currency || "NGN"} {formatWalletAmount(wallet.balance)}
            </p>
          </div>

          <form
            onSubmit={initializeWalletFunding}
            className="w-full max-w-[360px] rounded-[1.5rem] bg-[#f8f9fd] p-4"
          >
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6e54ef]">
              Fund wallet
            </p>
            <div className="mt-3 flex gap-2">
              <input
                className="field"
                type="number"
                min="500"
                step="100"
                value={walletFundAmount}
                onChange={(event) => setWalletFundAmount(event.target.value)}
                placeholder="Amount"
              />
              <button className="primary-button whitespace-nowrap" type="submit" disabled={walletFunding}>
                {walletFunding ? "Starting..." : "Fund now"}
              </button>
            </div>
            <p className="mt-2 text-xs text-staps-ink/55">
              Minimum top-up: NGN 500
            </p>
          </form>
        </div>

        <div className="mt-5 rounded-[1.5rem] border border-staps-ink/10 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6e54ef]">
                Personal funding account
              </p>
              <p className="mt-1 text-sm text-staps-ink/60">
                Transfer directly to your assigned account and Paystack will credit your wallet.
              </p>
            </div>
            {!wallet.fundingAccount?.accountNumber ? (
              <button
                className="secondary-button"
                type="button"
                onClick={provisionWalletFundingAccount}
                disabled={walletFundingAccountBusy || walletFundingAccountUnavailable}
              >
                {walletFundingAccountBusy
                  ? "Generating..."
                  : walletFundingAccountUnavailable
                    ? "Unavailable on current profile"
                    : "Generate account details"}
              </button>
            ) : null}
          </div>

          {wallet.fundingAccount?.accountNumber ? (
            <div className="mt-4 grid gap-3 rounded-2xl bg-[#f8f9fd] p-4 sm:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-staps-ink/45">
                  Account number
                </p>
                <p className="mt-1 font-display text-2xl font-extrabold text-staps-ink">
                  {wallet.fundingAccount.accountNumber}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-staps-ink/45">
                  Bank
                </p>
                <p className="mt-1 text-sm font-semibold text-staps-ink">
                  {wallet.fundingAccount.bankName || "Paystack partner bank"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-staps-ink/45">
                  Account name
                </p>
                <p className="mt-1 text-sm font-semibold text-staps-ink">
                  {wallet.fundingAccount.accountName || user?.name || "STAPS shopper"}
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-staps-ink/60">
              No personal funding account yet. Generate one to fund by bank transfer.
            </p>
          )}
        </div>

        <div className="mt-6 space-y-3">
          <h3 className="font-display text-xl font-bold">Recent wallet activity</h3>
          {wallet.transactions?.length ? (
            wallet.transactions.map((entry) => (
              <div key={entry._id} className="rounded-2xl border border-staps-ink/10 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-staps-ink">{entry.description}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.14em] text-staps-ink/45">
                      {formatNotificationTime(entry.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-lg font-extrabold ${
                        entry.direction === "credit" ? "text-emerald-600" : "text-[#6e54ef]"
                      }`}
                    >
                      {entry.direction === "credit" ? "+" : "-"}NGN {formatWalletAmount(entry.amount)}
                    </p>
                    <p className="text-xs text-staps-ink/55">
                      Balance: NGN {formatWalletAmount(entry.balanceAfter)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-staps-ink/60">No wallet transactions yet.</p>
          )}
        </div>
      </section>

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
                <div className="relative shrink-0">
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
                  <label
                    htmlFor="shopper-avatar-upload"
                    className="absolute -bottom-1 -right-1 inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-[#6e54ef] text-white shadow-[0_14px_24px_rgba(110,84,239,0.24)] transition hover:bg-[#5a49d6]"
                    title="Update profile picture"
                  >
                    <CameraIcon className="h-4 w-4" />
                  </label>
                  <input
                    id="shopper-avatar-upload"
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
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-staps-ink">{user?.name}</p>
                  <p className="text-sm text-staps-ink/60">@{user?.username || "username"}</p>
                  <p className="mt-1 text-xs text-staps-ink/45">{user?.email}</p>
                  <p className="mt-2 text-xs font-medium text-[#5a49d6]">
                    {profileForm.avatar
                      ? `Selected: ${profileForm.avatar.name}`
                      : "Tap the camera icon to change your profile picture."}
                  </p>
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
                <div className="rounded-[1.5rem] border border-staps-ink/10 bg-white px-4 py-4">
                  <p className="text-sm font-semibold text-staps-ink">Your rating</p>
                  <div className="mt-3">
                    {renderRatingStars(reviewForm.rating, {
                      interactive: true,
                      onSelect: (value) =>
                        setReviewForm((current) => ({ ...current, rating: String(value) })),
                    })}
                  </div>
                </div>
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
                      {renderRatingStars(review.rating)}
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

          <section className="hidden">
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

          <section id="messages" className="surface-card scroll-mt-28 p-6">
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#6e54ef]">
              Messages
            </p>
            <h2 className="mt-2 font-display text-2xl font-extrabold">Unread chats</h2>
            <div className="mt-5 space-y-3">
              {conversations.length ? (
                conversations.map((conversation) => (
                  <Link
                    key={conversation.id}
                    to={`/profiles/${conversation.participant?.id}`}
                    className="block rounded-2xl border border-staps-ink/8 bg-white p-4 transition hover:border-[#6e54ef]/30 hover:bg-[#faf8ff]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-staps-ink">
                          {conversation.participant?.name || "Conversation"}
                        </p>
                        <p className="text-sm text-staps-ink/55">
                          @{conversation.participant?.username || "user"}
                        </p>
                      </div>
                      {conversation.unreadCount ? (
                        <span className="rounded-full bg-[#6e54ef] px-3 py-1 text-xs font-semibold text-white">
                          {conversation.unreadCount} unread
                        </span>
                      ) : (
                        <span className="rounded-full bg-staps-mist px-3 py-1 text-xs font-semibold text-staps-ink/55">
                          Up to date
                        </span>
                      )}
                    </div>
                    <p className="mt-3 truncate text-sm text-staps-ink/65">
                      {conversation.lastMessagePreview || "Open the conversation to send a message."}
                    </p>
                    {formatNotificationTime(conversation.lastMessageAt) ? (
                      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-staps-ink/45">
                        {formatNotificationTime(conversation.lastMessageAt)}
                      </p>
                    ) : null}
                  </Link>
                ))
              ) : (
                <p className="text-sm text-staps-ink/65">Your chat threads will appear here.</p>
              )}
            </div>
          </section>

          <section id="notifications" className="surface-card scroll-mt-28 p-6">
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#6e54ef]">Alerts</p>
            <h2 className="mt-2 font-display text-2xl font-extrabold">Notifications</h2>
            <p className="mt-2 text-sm text-staps-ink/55">
              Swipe left on any alert to remove it from your list.
            </p>
            <div className="mt-5 space-y-3">
              {notifications.length ? (
                notifications.map((notification) => (
                  <SwipeableNotificationCard
                    key={notification._id}
                    badge={notification.metadata?.orderNumber || ""}
                    deleting={deletingNotificationId === notification._id}
                    message={notification.message}
                    onDelete={() => dismissNotification(notification._id)}
                    timestamp={formatNotificationTime(notification.createdAt)}
                    title={notification.title}
                  />
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
