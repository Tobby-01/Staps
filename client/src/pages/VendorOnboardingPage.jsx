import { useState } from "react";

import { apiRequest } from "../lib/api.js";
import { useAuth } from "../state/AuthContext.jsx";

export const VendorOnboardingPage = () => {
  const { refreshUser } = useAuth();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    accountNumber: "",
    idDocument: null,
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submitApplication = async (event) => {
    event.preventDefault();
    const normalizedAccountNumber = String(form.accountNumber || "").replace(/\D/g, "");

    if (normalizedAccountNumber.length !== 10) {
      setMessage("");
      setError("Payout account number must be 10 digits.");
      return;
    }

    if (!form.idDocument) {
      setMessage("");
      setError("ID document upload is required.");
      return;
    }

    const formData = new FormData();
    formData.append("name", form.name.trim());
    formData.append("phone", form.phone.trim());
    formData.append("payoutAccountNumber", normalizedAccountNumber);
    formData.append("idDocument", form.idDocument);

    try {
      setLoading(true);
      setError("");
      await apiRequest("/api/vendors/apply", {
        method: "POST",
        body: formData,
      });
      await refreshUser();
      setMessage("Application submitted. You can now pay the NGN 1,000 vendor registration fee.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const initializePayment = async () => {
    try {
      const response = await apiRequest("/api/vendors/payment/initialize", {
        method: "POST",
      });
      window.location.href = response.payment.authorization_url;
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <div className="mx-auto max-w-3xl surface-card p-8">
      <p className="text-sm font-bold uppercase tracking-[0.25em] text-staps-orange">
        Vendor onboarding
      </p>
      <h1 className="mt-2 font-display text-3xl font-extrabold">Submit your vendor application</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-staps-ink/65">
        Upload your ID document, provide contact details, and add your payout account number.
        Then complete your registration fee through Paystack. Admin approval is still required
        before you can list products.
      </p>

      <form onSubmit={submitApplication} className="mt-8 grid gap-4">
        <input
          className="field"
          placeholder="Business or display name"
          value={form.name}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
        />
        <input
          className="field"
          placeholder="Phone number"
          value={form.phone}
          onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
        />
        <input
          className="field"
          placeholder="Payout account number (10 digits)"
          inputMode="numeric"
          value={form.accountNumber}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              accountNumber: event.target.value.replace(/\D/g, "").slice(0, 10),
            }))
          }
        />
        <input
          className="field"
          type="file"
          accept="image/*,.pdf"
          onChange={(event) =>
            setForm((current) => ({ ...current, idDocument: event.target.files?.[0] || null }))
          }
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-staps-orange">{message}</p>}
        <div className="flex flex-wrap gap-3">
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? "Submitting..." : "Submit application"}
          </button>
          <button className="secondary-button" type="button" onClick={initializePayment}>
            Pay registration fee (NGN 1,000)
          </button>
        </div>
      </form>
    </div>
  );
};
