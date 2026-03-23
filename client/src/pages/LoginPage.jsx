import { useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";

import { apiRequest } from "../lib/api.js";
import { useAuth } from "../state/AuthContext.jsx";

const resolveDestination = (role) =>
  role === "admin" ? "/admin" : role === "vendor" ? "/vendor" : "/dashboard";

const normalizeMode = (value) =>
  ["login", "forgot", "reset"].includes(value) ? value : "login";

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [form, setForm] = useState({ email: "", password: "" });
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetForm, setResetForm] = useState({
    email: "",
    code: "",
    newPassword: "",
    confirmPassword: "",
  });
  const mode = normalizeMode(searchParams.get("mode") || "login");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const switchMode = (nextMode) => {
    const normalizedMode = normalizeMode(nextMode);
    const nextParams = new URLSearchParams(searchParams);

    if (normalizedMode === "login") {
      nextParams.delete("mode");
    } else {
      nextParams.set("mode", normalizedMode);
    }

    setSearchParams(nextParams);
    setError("");
    setMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setLoading(true);
      setError("");
      setMessage("");
      const response = await login(form);
      navigate(
        location.state?.from?.pathname || resolveDestination(response.user.role),
      );
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (event) => {
    event.preventDefault();

    try {
      setLoading(true);
      setError("");
      const response = await apiRequest("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: forgotEmail }),
      });

      setMessage(response.message);
      setResetForm((current) => ({
        ...current,
        email: forgotEmail,
      }));
      switchMode("reset");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();

    if (resetForm.newPassword !== resetForm.confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const response = await apiRequest("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          email: resetForm.email,
          code: resetForm.code,
          newPassword: resetForm.newPassword,
        }),
      });

      setMessage(response.message);
      setForm((current) => ({ ...current, email: resetForm.email, password: "" }));
      setResetForm({
        email: resetForm.email,
        code: "",
        newPassword: "",
        confirmPassword: "",
      });
      switchMode("login");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const heading =
    mode === "forgot"
      ? "Reset your password"
      : mode === "reset"
        ? "Enter your reset code"
        : "Welcome back";

  const copy =
    mode === "forgot"
      ? "Enter your email and we will generate a one-time reset code for your account."
      : mode === "reset"
        ? "Use the reset code to choose a new password and get back into your account."
        : "Log in to track orders, manage listings, and access your campus storefront.";

  return (
    <div className="mx-auto max-w-lg surface-card p-8">
      <div className="flex flex-wrap gap-2">
        {[
          ["login", "Login"],
          ["forgot", "Forgot password"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => switchMode(value)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              mode === value
                ? "bg-[#6e54ef] text-white"
                : "bg-staps-mist text-staps-ink hover:bg-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <h1 className="mt-6 font-display text-3xl font-extrabold">{heading}</h1>
      <p className="mt-2 text-sm text-staps-ink/65">{copy}</p>

      {message && <p className="mt-4 rounded-2xl bg-[#f3f7f0] px-4 py-3 text-sm text-staps-ink">{message}</p>}
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {mode === "login" ? (
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
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
            placeholder="Password"
            value={form.password}
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
          />
          <button className="primary-button w-full" disabled={loading} type="submit">
            {loading ? "Signing you in..." : "Login"}
          </button>
          <button
            type="button"
            onClick={() => {
              setForgotEmail(form.email);
              switchMode("forgot");
            }}
            className="w-full text-sm font-semibold text-staps-orange"
          >
            Forgot your password?
          </button>
        </form>
      ) : mode === "forgot" ? (
        <form onSubmit={handleForgotPassword} className="mt-8 space-y-4">
          <input
            className="field"
            type="email"
            placeholder="Email address"
            value={forgotEmail}
            onChange={(event) => setForgotEmail(event.target.value)}
          />
          <button className="primary-button w-full" disabled={loading} type="submit">
            {loading ? "Generating reset code..." : "Send reset code"}
          </button>
          <p className="text-xs text-staps-ink/55">Check your inbox for the 6-digit reset code.</p>
        </form>
      ) : (
        <form onSubmit={handleResetPassword} className="mt-8 space-y-4">
          <input
            className="field"
            type="email"
            placeholder="Email address"
            value={resetForm.email}
            onChange={(event) =>
              setResetForm((current) => ({ ...current, email: event.target.value }))
            }
          />
          <input
            className="field"
            type="text"
            inputMode="numeric"
            placeholder="6-digit reset code"
            value={resetForm.code}
            onChange={(event) =>
              setResetForm((current) => ({ ...current, code: event.target.value }))
            }
          />
          <input
            className="field"
            type="password"
            placeholder="New password"
            value={resetForm.newPassword}
            onChange={(event) =>
              setResetForm((current) => ({ ...current, newPassword: event.target.value }))
            }
          />
          <input
            className="field"
            type="password"
            placeholder="Confirm new password"
            value={resetForm.confirmPassword}
            onChange={(event) =>
              setResetForm((current) => ({ ...current, confirmPassword: event.target.value }))
            }
          />
          <button className="primary-button w-full" disabled={loading} type="submit">
            {loading ? "Resetting password..." : "Reset password"}
          </button>
        </form>
      )}

      <p className="mt-6 text-sm text-staps-ink/70">
        New here?{" "}
        <Link to="/signup" className="font-semibold text-staps-orange">
          Create an account
        </Link>
      </p>
    </div>
  );
};
