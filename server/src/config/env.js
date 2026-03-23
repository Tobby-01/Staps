import path from "path";
import { fileURLToPath } from "url";

import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.resolve(__dirname, "../../.env"),
});

const trimTrailingSlash = (value = "") => String(value).trim().replace(/\/+$/, "");
const splitUrlList = (value = "") =>
  String(value)
    .split(",")
    .map((entry) => trimTrailingSlash(entry))
    .filter(Boolean);

const isLocalUrl = (value = "") => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(value);

const configuredClientUrls = splitUrlList(
  process.env.CLIENT_URL || process.env.FRONTEND_URL || process.env.PUBLIC_CLIENT_URL || "",
);
const clientUrls = configuredClientUrls.length
  ? configuredClientUrls
  : ["http://localhost:5173"];
const primaryClientUrl =
  clientUrls.find((url) => !isLocalUrl(url)) || clientUrls[0] || "http://localhost:5173";
const serverUrl =
  trimTrailingSlash(process.env.SERVER_URL || process.env.RENDER_EXTERNAL_URL || "") ||
  `http://localhost:${process.env.PORT || 5000}`;

export const env = {
  port: Number(process.env.PORT || 5000),
  clientUrl: primaryClientUrl,
  clientUrls,
  serverUrl,
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/staps",
  jwtSecret: process.env.JWT_SECRET || "change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  cookieName: process.env.COOKIE_NAME || "staps_token",
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: Number(process.env.SMTP_PORT || 465),
  smtpSecure: String(process.env.SMTP_SECURE || "true") === "true",
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  mailFrom: process.env.MAIL_FROM || "",
  smtpConnectionTimeoutMs: Number(process.env.SMTP_CONNECTION_TIMEOUT_MS || 10000),
  smtpGreetingTimeoutMs: Number(process.env.SMTP_GREETING_TIMEOUT_MS || 10000),
  smtpSocketTimeoutMs: Number(process.env.SMTP_SOCKET_TIMEOUT_MS || 15000),
  paystackSecretKey: process.env.PAYSTACK_SECRET_KEY || "",
  paystackBaseUrl: process.env.PAYSTACK_BASE_URL || "https://api.paystack.co",
  paystackCallbackUrl:
    trimTrailingSlash(process.env.PAYSTACK_CALLBACK_URL || "") ||
    `${primaryClientUrl}/payment/callback`,
  passwordResetCodeTtlMinutes: Number(process.env.PASSWORD_RESET_CODE_TTL_MINUTES || 15),
  vendorRegistrationFee: Number(process.env.VENDOR_REGISTRATION_FEE || 1000),
  autoConfirmHours: Number(process.env.AUTO_CONFIRM_HOURS || 72),
  cancelWindowMinutes: Number(process.env.CANCEL_WINDOW_MINUTES || 90),
  isProduction: process.env.NODE_ENV === "production",
};
