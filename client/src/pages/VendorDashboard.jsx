import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { apiRequest, resolveAssetUrl } from "../lib/api.js";

const productCategories = [
  "Fashion",
  "Campus Tech",
  "Sport",
  "Food",
  "Books",
  "Accessories",
  "Health & Wellness",
  "Music",
  "Gaming",
  "Art",
];

const initialProduct = {
  name: "",
  price: "",
  description: "",
  category: productCategories[0],
  isFlashSale: false,
  discountPrice: "",
  flashSaleEndTime: "",
  images: [],
};

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

export const VendorDashboard = () => {
  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [banks, setBanks] = useState([]);
  const [form, setForm] = useState(initialProduct);
  const [editingProductId, setEditingProductId] = useState("");
  const [editForm, setEditForm] = useState(initialProduct);
  const [editCurrentImages, setEditCurrentImages] = useState([]);
  const [payoutForm, setPayoutForm] = useState({
    bankCode: "",
    accountNumber: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const imagePreviews = useMemo(
    () => form.images.map((file) => ({ name: file.name, url: URL.createObjectURL(file) })),
    [form.images],
  );
  const editImagePreviews = useMemo(
    () => editForm.images.map((file) => ({ name: file.name, url: URL.createObjectURL(file) })),
    [editForm.images],
  );

  useEffect(
    () => () => {
      imagePreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    },
    [imagePreviews],
  );

  useEffect(
    () => () => {
      editImagePreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    },
    [editImagePreviews],
  );

  const loadDashboard = async () => {
    const [
      vendorResponse,
      ordersResponse,
      productsResponse,
      banksResponse,
      notificationsResponse,
    ] = await Promise.all([
      apiRequest("/api/vendors/me"),
      apiRequest("/api/orders"),
      apiRequest("/api/products"),
      apiRequest("/api/vendors/payout/banks"),
      apiRequest("/api/notifications"),
    ]);

    setProfile(vendorResponse.vendor);
    setBanks((banksResponse.banks || []).filter((bank) => bank.active !== false));
    setOrders(ordersResponse.orders || []);
    setNotifications(notificationsResponse.notifications || []);
    setProducts(
      (productsResponse.products || []).filter(
        (product) => product.vendor?._id === vendorResponse.vendor?.user?._id,
      ),
    );
    setPayoutForm({
      bankCode: vendorResponse.vendor?.payoutAccount?.bankCode || "",
      accountNumber: vendorResponse.vendor?.payoutAccount?.accountNumber || "",
    });
    setError("");
  };

  useEffect(() => {
    loadDashboard().catch((requestError) => setError(requestError.message));
  }, []);

  const createProduct = async (event) => {
    event.preventDefault();

    const formData = new FormData();
    formData.append("name", form.name);
    formData.append("price", form.price);
    formData.append("description", form.description);
    formData.append("category", form.category);
    formData.append("isFlashSale", String(form.isFlashSale));

    if (form.discountPrice) {
      formData.append("discountPrice", form.discountPrice);
    }

    if (form.flashSaleEndTime) {
      formData.append("flashSaleEndTime", form.flashSaleEndTime);
    }

    form.images.forEach((image) => {
      formData.append("images", image);
    });

    try {
      setError("");
      await apiRequest("/api/products", {
        method: "POST",
        body: formData,
      });
      setForm(initialProduct);
      setMessage("Product published successfully.");
      await loadDashboard();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const savePayoutAccount = async (event) => {
    event.preventDefault();

    try {
      setError("");
      await apiRequest("/api/vendors/payout/setup", {
        method: "POST",
        body: JSON.stringify(payoutForm),
      });
      setMessage("Payout account saved successfully.");
      await loadDashboard();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const updateOrderStatus = async (orderId, action) => {
    await apiRequest(`/api/orders/${orderId}/${action}`, { method: "PATCH" });
    setMessage(`Order updated: ${action}`);
    await loadDashboard();
  };

  const delistProduct = async (productId, productName) => {
    const shouldContinue = window.confirm(
      `Delist "${productName}"? It will be removed from the storefront for shoppers.`,
    );

    if (!shouldContinue) {
      return;
    }

    try {
      setError("");
      await apiRequest(`/api/products/${productId}`, { method: "DELETE" });
      setMessage("Product delisted successfully.");
      await loadDashboard();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const startEditingProduct = (product) => {
    setEditingProductId(product._id);
    setEditCurrentImages(product.images?.length ? product.images : product.image ? [product.image] : []);
    setEditForm({
      name: product.name || "",
      price: String(product.price || ""),
      description: product.description || "",
      category: product.category || productCategories[0],
      isFlashSale: Boolean(product.isFlashSale),
      discountPrice: product.discountPrice ? String(product.discountPrice) : "",
      flashSaleEndTime: product.flashSaleEndTime
        ? new Date(product.flashSaleEndTime).toISOString().slice(0, 16)
        : "",
      images: [],
    });
    setError("");
    setMessage("");
  };

  const cancelEditingProduct = () => {
    setEditingProductId("");
    setEditCurrentImages([]);
    setEditForm(initialProduct);
  };

  const saveProductChanges = async (productId) => {
    const formData = new FormData();
    formData.append("name", editForm.name);
    formData.append("price", editForm.price);
    formData.append("description", editForm.description);
    formData.append("category", editForm.category);
    formData.append("isFlashSale", String(editForm.isFlashSale));
    formData.append("discountPrice", editForm.discountPrice);
    formData.append("flashSaleEndTime", editForm.flashSaleEndTime);

    editForm.images.forEach((image) => {
      formData.append("images", image);
    });

    try {
      setError("");
      await apiRequest(`/api/products/${productId}`, {
        method: "PATCH",
        body: formData,
      });
      setMessage("Product updated successfully.");
      cancelEditingProduct();
      await loadDashboard();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const earnings = orders
    .filter((order) => order.paymentReleased)
    .reduce((sum, order) => sum + order.totalAmount, 0);

  const securedEarnings = orders
    .filter((order) => ["processing", "shipped", "delivered", "completed"].includes(order.status))
    .reduce((sum, order) => sum + order.totalAmount, 0);

  return (
    <div className="space-y-6">
      <section className="grid gap-5 lg:grid-cols-5">
        {[
          ["Verification", profile?.verified ? "Approved" : "Pending review"],
          ["Registration fee", profile?.paymentStatus || "pending"],
          ["Orders", String(orders.length)],
          ["Secured earnings", `NGN ${securedEarnings.toLocaleString()}`],
          ["Released earnings", `NGN ${earnings.toLocaleString()}`],
        ].map(([label, value]) => (
          <div key={label} className="surface-card p-5">
            <p className="text-sm text-staps-ink/55">{label}</p>
            <p className="mt-3 font-display text-2xl font-extrabold">{value}</p>
          </div>
        ))}
      </section>

      {(message || error) && (
        <div className="surface-card p-4 text-sm">
          <span className={error ? "text-red-600" : "text-staps-orange"}>{error || message}</span>
        </div>
      )}

      <section className="surface-card p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#6e54ef]">
              Separate profiles
            </p>
            <h2 className="mt-2 font-display text-2xl font-extrabold">Need to shop too?</h2>
            <p className="mt-2 max-w-2xl text-sm text-staps-ink/65">
              Vendor accounts can only manage products, orders, and payouts. To buy from STAPS, create a separate shopper account.
            </p>
          </div>
          <Link to="/signup" className="primary-button text-center">
            Shop now
          </Link>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <form onSubmit={createProduct} className="surface-card p-6">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-staps-orange">
            Product studio
          </p>
          <h2 className="mt-2 font-display text-3xl font-extrabold">Add a new product</h2>
          <p className="mt-2 text-sm text-staps-ink/60">
            Vendors can now assign a category and upload multiple product images with preview.
          </p>

          <div className="mt-6 grid gap-4">
            <input
              className="field"
              placeholder="Product name"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <input
                className="field"
                type="number"
                placeholder="Price"
                value={form.price}
                onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))}
              />
              <select
                className="field"
                value={form.category}
                onChange={(event) =>
                  setForm((current) => ({ ...current, category: event.target.value }))
                }
              >
                {productCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              className="field min-h-28"
              placeholder="Description"
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
            />
            <label className="flex items-center gap-3 rounded-2xl bg-staps-mist px-4 py-3">
              <input
                type="checkbox"
                checked={form.isFlashSale}
                onChange={(event) =>
                  setForm((current) => ({ ...current, isFlashSale: event.target.checked }))
                }
              />
              <span className="font-semibold">Enable flash sale</span>
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <input
                className="field"
                type="number"
                placeholder="Discount price"
                value={form.discountPrice}
                onChange={(event) =>
                  setForm((current) => ({ ...current, discountPrice: event.target.value }))
                }
              />
              <input
                className="field"
                type="datetime-local"
                value={form.flashSaleEndTime}
                onChange={(event) =>
                  setForm((current) => ({ ...current, flashSaleEndTime: event.target.value }))
                }
              />
            </div>

            <div className="rounded-[1.6rem] border border-dashed border-staps-ink/15 bg-[#f8f9fd] p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold text-staps-ink">Product gallery</p>
                  <p className="text-sm text-staps-ink/55">
                    Upload up to 6 pictures. The first image becomes the main storefront image.
                  </p>
                </div>
                <label className="rounded-full bg-[#6e54ef] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#5a49d6]">
                  Choose images
                  <input
                    className="hidden"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        images: Array.from(event.target.files || []).slice(0, 6),
                      }))
                    }
                  />
                </label>
              </div>

              {imagePreviews.length ? (
                <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
                  {imagePreviews.map((preview, index) => (
                    <div key={`${preview.name}-${index}`} className="overflow-hidden rounded-[1.35rem] bg-white">
                      <div className="h-28 bg-[#eef2f8]">
                        <img src={preview.url} alt={preview.name} className="h-full w-full object-cover" />
                      </div>
                      <div className="px-3 py-2 text-xs text-staps-ink/65">
                        {index === 0 ? "Primary image" : `Gallery image ${index + 1}`}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-[1.35rem] bg-white px-4 py-6 text-sm text-staps-ink/55">
                  No images selected yet.
                </div>
              )}
            </div>

            <button className="primary-button" type="submit">
              Publish product
            </button>
          </div>
        </form>

        <div className="space-y-6">
          <section className="surface-card p-6">
            <h2 className="font-display text-2xl font-extrabold">Payout setup</h2>
            <p className="mt-2 text-sm text-staps-ink/60">
              Add the bank account where STAPS should send your order payouts after delivery is
              confirmed.
            </p>
            <form onSubmit={savePayoutAccount} className="mt-5 grid gap-4 md:grid-cols-2">
              <select
                className="field"
                value={payoutForm.bankCode}
                onChange={(event) =>
                  setPayoutForm((current) => ({ ...current, bankCode: event.target.value }))
                }
              >
                <option value="">Select bank</option>
                {banks.map((bank) => (
                  <option key={bank.id || bank.code} value={bank.code}>
                    {bank.name}
                  </option>
                ))}
              </select>
              <input
                className="field"
                placeholder="Account number"
                value={payoutForm.accountNumber}
                onChange={(event) =>
                  setPayoutForm((current) => ({ ...current, accountNumber: event.target.value }))
                }
              />
              <div className="rounded-2xl bg-staps-mist px-4 py-3 text-sm text-staps-ink md:col-span-2">
                <p>
                  Account name: {profile?.payoutAccount?.accountName || "Not resolved yet"}
                </p>
                <p className="mt-1">
                  Status: {profile?.payoutAccount?.setupComplete ? "Ready for payout" : "Not configured"}
                </p>
              </div>
              <button className="primary-button md:col-span-2" type="submit">
                Save payout account
              </button>
            </form>
          </section>

          <section className="surface-card p-6">
            <h2 className="font-display text-2xl font-extrabold">Order queue</h2>
            <div className="mt-5 space-y-4">
              {orders.length ? (
                orders.map((order) => {
                  const isCanceled = order.status === "canceled";
                  const isCompleted = order.status === "completed";
                  const payoutReleased = Boolean(order.paymentReleased);
                  const payoutRequested = Boolean(order.payoutRequestedAt);
                  const payoutStatusCopy =
                    {
                      payment_secured: "Payment secured",
                      awaiting_payout_request: "Ready for payout request",
                      payout_requested: "Payout requested",
                      awaiting_payout_setup: "Add payout details",
                      release_pending: "Payout pending",
                      pending: "Payout queued",
                      success: "Payout released",
                    }[order.vendorTransferStatus] || "";

                  return (
                    <div
                      key={order._id}
                      className={`relative rounded-3xl border p-4 ${
                        isCanceled
                          ? "border-red-200 bg-red-50/70"
                          : isCompleted
                            ? "border-sky-200 bg-sky-50/80"
                            : "border-staps-ink/10"
                      }`}
                    >
                      {isCanceled ? (
                        <div className="pointer-events-none absolute right-4 top-4 rotate-[-10deg] rounded-xl border-2 border-red-600 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.24em] text-red-600 opacity-85">
                          Canceled
                        </div>
                      ) : null}
                      {isCompleted ? (
                        <div className="pointer-events-none absolute right-4 top-4 rotate-[-10deg] rounded-xl border-2 border-sky-600 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.24em] text-sky-600 opacity-85">
                          Delivered
                        </div>
                      ) : null}
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-start gap-4">
                          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[1.2rem] bg-[#eef2f8]">
                            {order.product?.image || order.product?.images?.[0] ? (
                              <img
                                src={resolveAssetUrl(order.product?.image || order.product?.images?.[0])}
                                alt={order.product?.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-[0.65rem] font-semibold text-staps-ink/40">
                                Item
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold">{order.product?.name}</p>
                            <p
                              className={`text-sm ${
                                isCanceled
                                  ? "text-red-700"
                                  : isCompleted
                                    ? "text-sky-700"
                                    : "text-staps-ink/60"
                              }`}
                            >
                              {order.user?._id ? (
                                <Link
                                  to={`/profiles/${order.user._id}`}
                                  className="font-semibold text-[#5a49d6]"
                                >
                                  {order.user?.name}
                                </Link>
                              ) : (
                                order.user?.name
                              )}{" "}
                              | {order.status} | NGN {order.totalAmount?.toLocaleString()}
                            </p>
                            <p className="text-sm text-staps-ink/60">
                              Delivery: {order.deliveryDetails?.location || "Not set"}
                            </p>
                            <p className="text-sm text-staps-ink/60">
                              {order.deliveryDetails?.address || "No delivery address"}
                            </p>
                            {payoutStatusCopy ? (
                              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#5a49d6]">
                                {payoutStatusCopy}
                              </p>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {order.status === "paid" && (
                            <button
                              className="secondary-button"
                              type="button"
                              onClick={() => updateOrderStatus(order._id, "accept")}
                            >
                              Accept
                            </button>
                          )}
                          {order.status === "processing" && (
                            <button
                              className="secondary-button"
                              type="button"
                              onClick={() => updateOrderStatus(order._id, "shipped")}
                            >
                              Mark shipped
                            </button>
                          )}
                          {order.status === "shipped" && (
                            <>
                              {!payoutReleased && (
                                <button
                                  className="secondary-button"
                                  type="button"
                                  onClick={() => updateOrderStatus(order._id, "request-payout")}
                                >
                                  {payoutRequested ? "Payout requested" : "Request payout"}
                                </button>
                              )}
                              <button
                                className="secondary-button"
                                type="button"
                                onClick={() => updateOrderStatus(order._id, "delivered")}
                              >
                                Mark delivered
                              </button>
                            </>
                          )}
                          {payoutReleased && (
                            <div className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-emerald-700">
                              Payout released
                            </div>
                          )}
                          {isCanceled && (
                            <div className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-red-600">
                              Shopper canceled this order
                            </div>
                          )}
                          {isCompleted && (
                            <div className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-sky-700">
                              Shopper confirmed delivery
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-staps-ink/65">New orders will appear here.</p>
              )}
            </div>
          </section>

          <section className="surface-card p-6">
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#6e54ef]">
              Alerts
            </p>
            <h2 className="mt-2 font-display text-2xl font-extrabold">Notifications</h2>
            <div className="mt-5 space-y-3">
              {notifications.length ? (
                notifications.map((notification) => (
                  <div key={notification._id} className="rounded-2xl bg-staps-mist p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold">{notification.title}</p>
                      {notification.metadata?.orderNumber ? (
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#5a49d6]">
                          {notification.metadata.orderNumber}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-staps-ink/65">{notification.message}</p>
                    {formatNotificationTime(notification.createdAt) ? (
                      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-staps-ink/45">
                        {formatNotificationTime(notification.createdAt)}
                      </p>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="text-sm text-staps-ink/65">No new alerts yet.</p>
              )}
            </div>
          </section>

          <section className="surface-card p-6">
            <h2 className="font-display text-2xl font-extrabold">Your listings</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {products.length ? (
                products.map((product) => (
                  <div key={product._id} className="overflow-hidden rounded-3xl bg-staps-mist">
                    <div className="h-36 bg-white/70">
                      {product.image || product.images?.[0] ? (
                        <img
                          src={resolveAssetUrl(product.image || product.images?.[0])}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-staps-ink/45">
                          No image
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{product.name}</p>
                          <p className="mt-1 text-sm text-staps-ink/60">{product.category}</p>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-700">
                          Listed
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-staps-ink">
                        NGN {Number(product.price).toLocaleString()}
                      </p>
                      <p className="mt-2 text-xs text-staps-ink/55">
                        {product.images?.length || (product.image ? 1 : 0)} image(s) uploaded
                      </p>
                      <div className="mt-4 flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            editingProductId === product._id
                              ? cancelEditingProduct()
                              : startEditingProduct(product)
                          }
                          className="secondary-button w-full"
                        >
                          {editingProductId === product._id ? "Close editor" : "Edit listing"}
                        </button>
                        <button
                          type="button"
                          onClick={() => delistProduct(product._id, product.name)}
                          className="secondary-button w-full border-red-200 bg-white text-red-600 hover:bg-red-50"
                        >
                          Delist product
                        </button>
                      </div>

                      {editingProductId === product._id && (
                        <div className="mt-4 space-y-3 rounded-[1.4rem] border border-staps-ink/10 bg-white p-4">
                          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#644df0]">
                            Edit listing
                          </p>
                          <input
                            className="field"
                            placeholder="Product name"
                            value={editForm.name}
                            onChange={(event) =>
                              setEditForm((current) => ({ ...current, name: event.target.value }))
                            }
                          />
                          <div className="grid gap-3 md:grid-cols-2">
                            <input
                              className="field"
                              type="number"
                              placeholder="Price"
                              value={editForm.price}
                              onChange={(event) =>
                                setEditForm((current) => ({ ...current, price: event.target.value }))
                              }
                            />
                            <select
                              className="field"
                              value={editForm.category}
                              onChange={(event) =>
                                setEditForm((current) => ({ ...current, category: event.target.value }))
                              }
                            >
                              {productCategories.map((category) => (
                                <option key={category} value={category}>
                                  {category}
                                </option>
                              ))}
                            </select>
                          </div>
                          <textarea
                            className="field min-h-24"
                            placeholder="Description"
                            value={editForm.description}
                            onChange={(event) =>
                              setEditForm((current) => ({
                                ...current,
                                description: event.target.value,
                              }))
                            }
                          />
                          <label className="flex items-center gap-3 rounded-2xl bg-staps-mist px-4 py-3">
                            <input
                              type="checkbox"
                              checked={editForm.isFlashSale}
                              onChange={(event) =>
                                setEditForm((current) => ({
                                  ...current,
                                  isFlashSale: event.target.checked,
                                }))
                              }
                            />
                            <span className="font-semibold">Enable flash sale</span>
                          </label>
                          <div className="grid gap-3 md:grid-cols-2">
                            <input
                              className="field"
                              type="number"
                              placeholder="Discount price"
                              value={editForm.discountPrice}
                              onChange={(event) =>
                                setEditForm((current) => ({
                                  ...current,
                                  discountPrice: event.target.value,
                                }))
                              }
                            />
                            <input
                              className="field"
                              type="datetime-local"
                              value={editForm.flashSaleEndTime}
                              onChange={(event) =>
                                setEditForm((current) => ({
                                  ...current,
                                  flashSaleEndTime: event.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-staps-ink/45">
                              Current images
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                              {editCurrentImages.length ? (
                                editCurrentImages.map((image, index) => (
                                  <div key={`${image}-${index}`} className="overflow-hidden rounded-2xl bg-[#f6f8fc]">
                                    <div className="h-24">
                                      <img
                                        src={resolveAssetUrl(image)}
                                        alt={`${product.name} ${index + 1}`}
                                        className="h-full w-full object-cover"
                                      />
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="rounded-2xl bg-[#f6f8fc] px-3 py-4 text-xs text-staps-ink/55">
                                  No current images
                                </div>
                              )}
                            </div>
                            <label className="secondary-button w-full cursor-pointer">
                              Replace images
                              <input
                                className="hidden"
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={(event) =>
                                  setEditForm((current) => ({
                                    ...current,
                                    images: Array.from(event.target.files || []).slice(0, 6),
                                  }))
                                }
                              />
                            </label>
                            {editImagePreviews.length ? (
                              <div className="grid grid-cols-2 gap-2">
                                {editImagePreviews.map((preview, index) => (
                                  <div key={`${preview.name}-${index}`} className="overflow-hidden rounded-2xl bg-[#f6f8fc]">
                                    <div className="h-24">
                                      <img
                                        src={preview.url}
                                        alt={preview.name}
                                        className="h-full w-full object-cover"
                                      />
                                    </div>
                                    <div className="px-2 py-2 text-[0.68rem] text-staps-ink/60">
                                      {index === 0 ? "New primary image" : `Replacement ${index + 1}`}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </div>
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <button
                              type="button"
                              onClick={() => saveProductChanges(product._id)}
                              className="primary-button w-full"
                            >
                              Save changes
                            </button>
                            <button
                              type="button"
                              onClick={cancelEditingProduct}
                              className="secondary-button w-full"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-staps-ink/65">Publish your first product after approval.</p>
              )}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
};
