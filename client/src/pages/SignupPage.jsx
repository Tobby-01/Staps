import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../state/AuthContext.jsx";

const roles = [
  { value: "user", label: "Shopper" },
  { value: "vendor", label: "Seller" },
];

const resolveDestination = (role) =>
  role === "admin" ? "/admin" : role === "vendor" ? "/vendor" : "/dashboard";

export const SignupPage = () => {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    role: "user",
    avatar: null,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setLoading(true);
      setError("");
      const formData = new FormData();
      formData.append("name", form.name);
      formData.append("username", form.username);
      formData.append("email", form.email);
      formData.append("password", form.password);
      formData.append("role", form.role);

      if (form.avatar) {
        formData.append("avatar", form.avatar);
      }

      const response = await signup(formData);
      navigate(resolveDestination(response.user.role));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl surface-card p-8">
      <h1 className="font-display text-3xl font-extrabold">Join STAPS</h1>
      <p className="mt-2 text-sm text-staps-ink/65">
        Sign up as a shopper or seller. Admin access is internal and never exposed here.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 grid gap-4 md:grid-cols-2">
        <input
          className="field md:col-span-2"
          type="text"
          placeholder="Full name"
          value={form.name}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
        />
        <input
          className="field md:col-span-2"
          type="text"
          placeholder="Unique username"
          value={form.username}
          onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
        />
        <input
          className="field"
          type="email"
          placeholder="Email address"
          value={form.email}
          onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
        />
        <input
          className="field"
          type="password"
          placeholder="Create password"
          value={form.password}
          onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
        />

        <div className="md:col-span-2 grid gap-3 sm:grid-cols-2">
          {roles.map((role) => (
            <button
              key={role.value}
              type="button"
              onClick={() => setForm((current) => ({ ...current, role: role.value }))}
              className={`rounded-3xl border p-5 text-left transition ${
                form.role === role.value
                  ? "border-staps-orange bg-staps-orange/5"
                  : "border-staps-ink/10 bg-white"
              }`}
            >
              <p className="font-display text-lg font-bold">{role.label}</p>
              <p className="mt-2 text-sm text-staps-ink/65">
                {role.value === "user"
                  ? "Discover products, shop safely, and confirm delivery with escrow protection."
                  : "Apply for verification, list products by category, and fulfill campus orders."}
              </p>
            </button>
          ))}
        </div>

        <label className="field md:col-span-2 flex cursor-pointer items-center justify-between gap-3">
          <span className="text-staps-ink/70">
            {form.avatar ? form.avatar.name : "Add a profile picture (optional)"}
          </span>
          <span className="rounded-full bg-[#eef2ff] px-4 py-2 text-sm font-semibold text-[#5a49d6]">
            Choose image
          </span>
          <input
            className="hidden"
            type="file"
            accept="image/*"
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                avatar: event.target.files?.[0] || null,
              }))
            }
          />
        </label>

        {error && <p className="md:col-span-2 text-sm text-red-600">{error}</p>}
        <button className="primary-button md:col-span-2" disabled={loading} type="submit">
          {loading ? "Creating your account..." : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-sm text-staps-ink/70">
        Already registered?{" "}
        <Link to="/login" className="font-semibold text-staps-orange">
          Log in
        </Link>
      </p>
      <p className="mt-2 text-sm text-staps-ink/70">
        Forgot your password for an existing account?{" "}
        <Link to="/login?mode=forgot" className="font-semibold text-staps-orange">
          Reset it here
        </Link>
      </p>
    </div>
  );
};
