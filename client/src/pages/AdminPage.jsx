import { useEffect, useState } from "react";

import { apiRequest, resolveAssetUrl } from "../lib/api.js";

const dateTimeFormatter = new Intl.DateTimeFormat("en-NG", {
  dateStyle: "medium",
  timeStyle: "short",
});

const metricLabels = {
  users: "Users",
  vendors: "Vendors",
  pendingVendors: "Pending vendors",
  products: "Products",
  orders: "Orders",
  payoutRequests: "Payout requests",
  restrictedVendors: "Restricted vendors",
};

const payoutStatusLabels = {
  payment_secured: "Payment secured",
  awaiting_payout_request: "Waiting for request",
  payout_requested: "Requested by vendor",
  awaiting_payout_setup: "Payout setup needed",
  release_pending: "Release pending",
  pending: "Transfer queued",
  success: "Released",
};

const formatDateTime = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return dateTimeFormatter.format(date);
};

const getVendorStatusCopy = (vendor) => {
  if (vendor.sellingStatus === "banned") {
    return "Banned from selling";
  }

  if (vendor.sellingStatus === "suspended") {
    return vendor.suspensionEndsAt
      ? `Suspended until ${formatDateTime(vendor.suspensionEndsAt)}`
      : "Temporarily suspended";
  }

  return "Selling is active";
};

const getVendorStatusClasses = (vendor) => {
  if (vendor.sellingStatus === "banned") {
    return "bg-red-100 text-red-700";
  }

  if (vendor.sellingStatus === "suspended") {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-emerald-100 text-emerald-700";
};

export const AdminPage = () => {
  const [metrics, setMetrics] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [payoutOrders, setPayoutOrders] = useState([]);
  const [suspensionHours, setSuspensionHours] = useState({});
  const [vendorNotes, setVendorNotes] = useState({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [actionKey, setActionKey] = useState("");

  const loadAdmin = async () => {
    const [dashboardResponse, vendorsResponse, payoutResponse] = await Promise.all([
      apiRequest("/api/admin/dashboard"),
      apiRequest("/api/admin/vendors"),
      apiRequest("/api/admin/payout-requests"),
    ]);

    const nextVendors = vendorsResponse.vendors || [];

    setMetrics(dashboardResponse.metrics);
    setVendors(nextVendors);
    setPayoutOrders(payoutResponse.orders || []);
    setSuspensionHours((current) =>
      nextVendors.reduce(
        (next, vendor) => ({
          ...next,
          [vendor._id]: current[vendor._id] || "24",
        }),
        {},
      ),
    );
    setVendorNotes((current) =>
      nextVendors.reduce(
        (next, vendor) => ({
          ...next,
          [vendor._id]: current[vendor._id] || "",
        }),
        {},
      ),
    );
  };

  useEffect(() => {
    loadAdmin().catch((requestError) => setError(requestError.message));
  }, []);

  const runAdminAction = async ({ key, request }) => {
    try {
      setActionKey(key);
      setMessage("");
      setError("");

      const response = await request();
      setMessage(response.message || "Admin action completed.");
      await loadAdmin();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setActionKey("");
    }
  };

  const approveVendor = (vendorId) =>
    runAdminAction({
      key: `approve-${vendorId}`,
      request: () =>
        apiRequest(`/api/admin/vendors/${vendorId}/approve`, {
          method: "PATCH",
        }),
    });

  const suspendVendor = (vendorId) => {
    const hours = Number(suspensionHours[vendorId] || 0);
    if (!Number.isFinite(hours) || hours <= 0) {
      setMessage("");
      setError("Suspension hours must be greater than zero.");
      return;
    }

    runAdminAction({
      key: `suspend-${vendorId}`,
      request: () =>
        apiRequest(`/api/admin/vendors/${vendorId}/suspend`, {
          method: "PATCH",
          body: JSON.stringify({
            hours,
            reason: vendorNotes[vendorId] || "",
          }),
        }),
    });
  };

  const banVendor = (vendorId, vendorName) => {
    const shouldContinue = window.confirm(
      `Ban ${vendorName || "this vendor"} from selling on STAPS?`,
    );

    if (!shouldContinue) {
      return;
    }

    runAdminAction({
      key: `ban-${vendorId}`,
      request: () =>
        apiRequest(`/api/admin/vendors/${vendorId}/ban`, {
          method: "PATCH",
          body: JSON.stringify({
            reason: vendorNotes[vendorId] || "",
          }),
        }),
    });
  };

  const restoreVendor = (vendorId, vendorName) => {
    const shouldContinue = window.confirm(
      `Restore selling access for ${vendorName || "this vendor"}?`,
    );

    if (!shouldContinue) {
      return;
    }

    runAdminAction({
      key: `restore-${vendorId}`,
      request: () =>
        apiRequest(`/api/admin/vendors/${vendorId}/restore`, {
          method: "PATCH",
        }),
    });
  };

  const releasePayout = (orderId, vendorName) => {
    const shouldContinue = window.confirm(
      `Release payout for ${vendorName || "this vendor"} on this order?`,
    );

    if (!shouldContinue) {
      return;
    }

    runAdminAction({
      key: `release-${orderId}`,
      request: () =>
        apiRequest(`/api/admin/orders/${orderId}/release-payout`, {
          method: "PATCH",
        }),
    });
  };

  return (
    <div className="space-y-6">
      <section className="surface-card p-6">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-staps-orange">
          Protected admin
        </p>
        <h1 className="mt-2 font-display text-3xl font-extrabold">Internal control room</h1>
        <p className="mt-2 max-w-3xl text-sm text-staps-ink/60">
          Review vendor payouts, control who is allowed to sell, and keep the marketplace moving
          without leaving the admin desk.
        </p>

        {(message || error) && (
          <div className="mt-4 rounded-3xl bg-staps-mist px-4 py-3 text-sm">
            <span className={error ? "text-red-600" : "text-staps-orange"}>{error || message}</span>
          </div>
        )}

        <div className="mt-6 grid gap-4 md:grid-cols-3 xl:grid-cols-7">
          {metrics &&
            Object.entries(metricLabels).map(([key, label]) => (
              <div key={key} className="rounded-3xl bg-staps-mist p-4">
                <p className="text-sm text-staps-ink/60">{label}</p>
                <p className="mt-2 font-display text-2xl font-extrabold">
                  {metrics[key] ?? 0}
                </p>
              </div>
            ))}
        </div>
      </section>

      <section className="surface-card p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="font-display text-2xl font-extrabold">Payout desk</h2>
            <p className="mt-1 text-sm text-staps-ink/60">
              Release only the payouts that vendors have explicitly requested.
            </p>
          </div>
          <div className="rounded-full bg-staps-mist px-4 py-2 text-sm font-semibold text-staps-ink/70">
            {payoutOrders.length} open request{payoutOrders.length === 1 ? "" : "s"}
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {payoutOrders.length ? (
            payoutOrders.map((order) => {
              const vendorName = order.vendorProfile?.name || order.vendor?.name || "Vendor";
              const payoutReady = Boolean(order.vendorProfile?.payoutAccount?.setupComplete);
              const busy = actionKey === `release-${order._id}`;

              return (
                <div key={order._id} className="rounded-3xl border border-staps-ink/10 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="h-16 w-16 overflow-hidden rounded-[1.2rem] bg-staps-mist">
                        {order.product?.image || order.product?.images?.[0] ? (
                          <img
                            src={resolveAssetUrl(order.product?.image || order.product?.images?.[0])}
                            alt={order.product?.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-staps-ink/45">
                            Item
                          </div>
                        )}
                      </div>

                      <div>
                        <p className="font-semibold text-staps-ink">{order.product?.name || "Order"}</p>
                        <p className="mt-1 text-sm text-staps-ink/60">
                          Vendor: {vendorName} | Shopper: {order.user?.name || "Unknown shopper"}
                        </p>
                        <p className="mt-1 text-sm text-staps-ink/60">
                          Status: {order.status} | Amount: NGN {order.totalAmount?.toLocaleString()}
                        </p>
                        <p className="mt-1 text-sm text-staps-ink/60">
                          Requested: {formatDateTime(order.payoutRequestedAt) || "Not set"}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-full bg-[#eef2ff] px-3 py-1 text-xs font-semibold text-[#5a49d6]">
                            {payoutStatusLabels[order.vendorTransferStatus] || "Awaiting review"}
                          </span>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              payoutReady
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {payoutReady ? "Payout account ready" : "Vendor must finish payout setup"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex w-full flex-col gap-3 lg:w-[240px]">
                      <button
                        className="primary-button"
                        type="button"
                        disabled={busy || !payoutReady}
                        onClick={() => releasePayout(order._id, vendorName)}
                      >
                        {busy
                          ? "Releasing payout..."
                          : order.vendorTransferStatus === "release_pending"
                            ? "Retry release"
                            : "Release payout"}
                      </button>
                      {!payoutReady && (
                        <p className="text-xs text-amber-700">
                          The vendor needs to save valid payout details before admin can release this
                          order.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-staps-ink/65">No vendor payout requests are waiting right now.</p>
          )}
        </div>
      </section>

      <section className="surface-card p-6">
        <h2 className="font-display text-2xl font-extrabold">Vendor controls</h2>
        <p className="mt-1 text-sm text-staps-ink/60">
          Approve new vendors, pause them for a fixed number of hours, or ban and restore selling
          access when needed.
        </p>

        <div className="mt-5 space-y-4">
          {vendors.map((vendor) => {
            const noteValue = vendorNotes[vendor._id] || "";
            const hoursValue = suspensionHours[vendor._id] || "24";
            const busyAction =
              actionKey === `approve-${vendor._id}` ||
              actionKey === `suspend-${vendor._id}` ||
              actionKey === `ban-${vendor._id}` ||
              actionKey === `restore-${vendor._id}`;

            return (
              <div key={vendor._id} className="rounded-3xl border border-staps-ink/10 p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="font-semibold text-staps-ink">{vendor.name}</p>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${getVendorStatusClasses(vendor)}`}
                      >
                        {getVendorStatusCopy(vendor)}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          vendor.verified
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-staps-mist text-staps-ink/70"
                        }`}
                      >
                        {vendor.verified ? "Approved" : "Awaiting approval"}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-staps-ink/60">
                      {vendor.user?.email || "No email"} | Payment: {vendor.paymentStatus} | Payout:{" "}
                      {vendor.payoutAccount?.setupComplete ? "Ready" : "Not configured"}
                    </p>

                    {vendor.sellingRestrictionReason && (
                      <p className="mt-2 text-sm text-staps-ink/70">
                        Admin note: {vendor.sellingRestrictionReason}
                      </p>
                    )}

                    {vendor.suspensionEndsAt && vendor.sellingStatus === "suspended" && (
                      <p className="mt-1 text-sm text-staps-ink/60">
                        Suspension ends {formatDateTime(vendor.suspensionEndsAt)}
                      </p>
                    )}
                  </div>

                  <div className="w-full max-w-[430px] space-y-3">
                    <input
                      className="field"
                      placeholder="Reason or internal note"
                      value={noteValue}
                      onChange={(event) =>
                        setVendorNotes((current) => ({
                          ...current,
                          [vendor._id]: event.target.value,
                        }))
                      }
                    />

                    <div className="grid gap-3 sm:grid-cols-[120px_minmax(0,1fr)]">
                      <input
                        className="field"
                        type="number"
                        min="1"
                        placeholder="Hours"
                        value={hoursValue}
                        onChange={(event) =>
                          setSuspensionHours((current) => ({
                            ...current,
                            [vendor._id]: event.target.value,
                          }))
                        }
                      />
                      <button
                        className="secondary-button"
                        type="button"
                        disabled={busyAction}
                        onClick={() => suspendVendor(vendor._id)}
                      >
                        {actionKey === `suspend-${vendor._id}` ? "Suspending..." : "Suspend vendor"}
                      </button>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      {!vendor.verified && (
                        <button
                          className="primary-button w-full"
                          type="button"
                          disabled={busyAction}
                          onClick={() => approveVendor(vendor._id)}
                        >
                          {actionKey === `approve-${vendor._id}` ? "Approving..." : "Approve vendor"}
                        </button>
                      )}

                      {vendor.sellingStatus !== "banned" && (
                        <button
                          className="secondary-button w-full border-red-200 bg-white text-red-600 hover:bg-red-50"
                          type="button"
                          disabled={busyAction}
                          onClick={() => banVendor(vendor._id, vendor.name)}
                        >
                          {actionKey === `ban-${vendor._id}` ? "Applying ban..." : "Ban from selling"}
                        </button>
                      )}

                      {vendor.sellingStatus !== "active" && (
                        <button
                          className="secondary-button w-full"
                          type="button"
                          disabled={busyAction}
                          onClick={() => restoreVendor(vendor._id, vendor.name)}
                        >
                          {actionKey === `restore-${vendor._id}` ? "Restoring..." : "Restore access"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
