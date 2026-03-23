import { useEffect, useState } from "react";

import { apiRequest } from "../lib/api.js";

export const AdminPage = () => {
  const [metrics, setMetrics] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [message, setMessage] = useState("");

  const loadAdmin = async () => {
    const [dashboardResponse, vendorsResponse] = await Promise.all([
      apiRequest("/api/admin/dashboard"),
      apiRequest("/api/admin/vendors"),
    ]);

    setMetrics(dashboardResponse.metrics);
    setVendors(vendorsResponse.vendors || []);
  };

  useEffect(() => {
    loadAdmin().catch((error) => setMessage(error.message));
  }, []);

  const approveVendor = async (vendorId) => {
    await apiRequest(`/api/admin/vendors/${vendorId}/approve`, {
      method: "PATCH",
    });
    setMessage("Vendor approved.");
    await loadAdmin();
  };

  return (
    <div className="space-y-6">
      <section className="surface-card p-6">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-staps-orange">Protected admin</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold">Internal control room</h1>
        {message && <p className="mt-4 text-sm text-staps-orange">{message}</p>}
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {metrics &&
            Object.entries(metrics).map(([key, value]) => (
              <div key={key} className="rounded-3xl bg-staps-mist p-4">
                <p className="text-sm capitalize text-staps-ink/60">{key}</p>
                <p className="mt-2 font-display text-2xl font-extrabold">{value}</p>
              </div>
            ))}
        </div>
      </section>

      <section className="surface-card p-6">
        <h2 className="font-display text-2xl font-extrabold">Vendor approvals</h2>
        <div className="mt-5 space-y-4">
          {vendors.map((vendor) => (
            <div key={vendor._id} className="rounded-3xl border border-staps-ink/10 p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold">{vendor.name}</p>
                  <p className="text-sm text-staps-ink/60">
                    {vendor.user?.email} • Payment: {vendor.paymentStatus} • Verified:{" "}
                    {String(vendor.verified)}
                  </p>
                </div>
                {!vendor.verified && (
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() => approveVendor(vendor._id)}
                  >
                    Approve vendor
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
