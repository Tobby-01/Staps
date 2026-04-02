import fs from "fs";
import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";

import { env } from "../config/env.js";
import { ApiError } from "../utils/api-error.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FREEMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "ymail.com",
  "rocketmail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "aol.com",
  "icloud.com",
  "me.com",
  "mac.com",
]);

const extractEmailAddress = (value = "") => {
  const normalized = String(value).trim();
  const match = normalized.match(/<([^>]+)>/);
  return (match?.[1] || normalized).trim().toLowerCase();
};

const getDomainFromAddress = (value = "") => {
  const address = extractEmailAddress(value);
  const [, domain = ""] = address.split("@");
  return domain.trim().toLowerCase();
};

const compactObject = (value) =>
  Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined && entryValue !== ""),
  );

const toErrorMessage = (value) => {
  if (!value) {
    return undefined;
  }

  if (typeof value === "string") {
    return value;
  }

  return value?.message || String(value);
};

export const hasMailConfig = () =>
  Boolean(env.smtpHost && env.smtpPort && env.smtpUser && env.smtpPass && env.mailFrom);

export const getMailConfigWarnings = () => {
  const warnings = [];
  const fromDomain = getDomainFromAddress(env.mailFrom);
  const smtpDomain = getDomainFromAddress(env.smtpUser);

  if (!env.isProduction) {
    return warnings;
  }

  if (fromDomain && FREEMAIL_DOMAINS.has(fromDomain)) {
    warnings.push(
      `MAIL_FROM uses the freemail domain "${fromDomain}". Switch to a domain mailbox such as hello@yourdomain.com and authenticate that domain with SPF, DKIM, and DMARC.`,
    );
  }

  if (smtpDomain && FREEMAIL_DOMAINS.has(smtpDomain)) {
    warnings.push(
      `SMTP_USER uses the freemail domain "${smtpDomain}". Consumer inboxes are unreliable for production notifications; use a transactional email provider or a mailbox on your own domain instead.`,
    );
  }

  if (fromDomain && smtpDomain && fromDomain !== smtpDomain) {
    warnings.push(
      `MAIL_FROM (${fromDomain}) does not match SMTP_USER (${smtpDomain}). Align them under the same authenticated domain to reduce spoofing and deliverability issues.`,
    );
  }

  return warnings;
};

export const getMailDiagnosticContext = () => ({
  transport: {
    host: env.smtpHost || "<missing>",
    port: env.smtpPort,
    secure: env.smtpSecure,
    user: env.smtpUser || "<missing>",
    from: env.mailFrom || "<missing>",
    debug: env.smtpDebug,
    connectionTimeoutMs: env.smtpConnectionTimeoutMs,
    greetingTimeoutMs: env.smtpGreetingTimeoutMs,
    socketTimeoutMs: env.smtpSocketTimeoutMs,
  },
  warnings: getMailConfigWarnings(),
});

export const formatMailErrorForLog = (error) =>
  compactObject({
    name: error?.name,
    message: error?.message || String(error),
    code: error?.code,
    command: error?.command,
    response: error?.response,
    responseCode: error?.responseCode,
    statusCode: error?.statusCode,
    syscall: error?.syscall,
    errno: error?.errno,
    address: error?.address,
    port: error?.port,
    hostname: error?.hostname,
    stage: error?.stage,
    source: error?.source,
    reason: error?.reason,
    cause: toErrorMessage(error?.cause),
    stack: error?.stack,
  });

let transporter;

const getTransporter = () => {
  if (!hasMailConfig()) {
    throw new ApiError(
      500,
      "Email service is not configured. Update SMTP settings in server/.env before sending reset emails.",
    );
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpSecure,
      logger: env.smtpDebug,
      debug: env.smtpDebug,
      connectionTimeout: env.smtpConnectionTimeoutMs,
      greetingTimeout: env.smtpGreetingTimeoutMs,
      socketTimeout: env.smtpSocketTimeoutMs,
      auth: {
        user: env.smtpUser,
        pass: env.smtpPass,
      },
    });
  }

  return transporter;
};

export const verifyMailTransport = async () => {
  if (!hasMailConfig()) {
    throw new ApiError(
      500,
      "Email service is not configured. Missing SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, or MAIL_FROM.",
    );
  }

  const client = getTransporter();
  await client.verify();

  return {
    host: env.smtpHost,
    port: env.smtpPort,
    user: env.smtpUser,
    from: env.mailFrom,
  };
};

const sendMail = async (payload) => {
  try {
    const mailPayload = {
      ...payload,
      html: payload.html
        ? wrapBrandedEmail({
            subject: payload.subject,
            html: payload.html,
          })
        : payload.html,
    };

    await getTransporter().sendMail(mailPayload);
  } catch (error) {
    console.error("SMTP send failed.");
    console.error(
      "Mail request context:",
      compactObject({
        to: Array.isArray(payload?.to) ? payload.to.join(", ") : payload?.to,
        subject: payload?.subject,
      }),
    );
    console.error("Mail transport context:", getMailDiagnosticContext());
    console.error("Mail transport error details:", formatMailErrorForLog(error));

    throw new ApiError(
      503,
      "We could not send email right now. Please check SMTP settings and try again.",
      { cause: error?.message || String(error) },
    );
  }
};

export const sendPasswordResetEmail = async ({ to, name, code }) => {
  const appName = "STAPS";
  const greeting = name?.trim() || "there";

  await sendMail({
    from: env.mailFrom,
    to,
    subject: `${appName} password reset code`,
    text: [
      `Hello ${greeting},`,
      "",
      `We received a request to reset your ${appName} password.`,
      `Your reset code is: ${code}`,
      "",
      `This code expires in ${env.passwordResetCodeTtlMinutes} minutes.`,
      "If you did not request this, you can ignore this email.",
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
        <p>Hello ${greeting},</p>
        <p>We received a request to reset your STAPS password.</p>
        <p style="margin: 24px 0;">
          <span style="display: inline-block; font-size: 28px; font-weight: 700; letter-spacing: 6px; padding: 12px 18px; border-radius: 12px; background: #f3f7f0; color: #ea6b2d;">
            ${code}
          </span>
        </p>
        <p>This code expires in ${env.passwordResetCodeTtlMinutes} minutes.</p>
        <p>If you did not request this, you can ignore this email.</p>
      </div>
    `,
  });
};

export const sendSignupVerificationEmail = async ({ to, name, code }) => {
  const greeting = name?.trim() || "there";

  await sendMail({
    from: env.mailFrom,
    to,
    subject: "STAPS verification pin",
    text: [
      `Hello ${greeting},`,
      "",
      `Use this 4-digit verification pin to activate your STAPS account: ${code}`,
      "",
      `This pin expires in ${env.passwordResetCodeTtlMinutes} minutes.`,
      "If you did not start this signup, you can ignore this email.",
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
        <p>Hello ${greeting},</p>
        <p>Use this 4-digit verification pin to activate your <strong>STAPS</strong> account.</p>
        <p style="margin: 24px 0;">
          <span style="display: inline-block; font-size: 28px; font-weight: 700; letter-spacing: 10px; padding: 12px 18px; border-radius: 12px; background: #eef2ff; color: #6e54ef;">
            ${code}
          </span>
        </p>
        <p>This pin expires in ${env.passwordResetCodeTtlMinutes} minutes.</p>
        <p>If you did not start this signup, you can ignore this email.</p>
      </div>
    `,
  });
};

const formatImageUrl = (imagePath = "") => {
  if (!imagePath) {
    return "";
  }

  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return imagePath;
  }

  return `${env.serverUrl}${imagePath}`;
};

const resolveEmailImage = (imagePath = "", cid) => {
  if (!imagePath) {
    return { src: "", attachments: [] };
  }

  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return { src: imagePath, attachments: [] };
  }

  const normalizedPath = imagePath.startsWith("/") ? imagePath.slice(1) : imagePath;
  const absolutePath = path.resolve(__dirname, "../../", normalizedPath);

  if (fs.existsSync(absolutePath)) {
    return {
      src: `cid:${cid}`,
      attachments: [
        {
          filename: path.basename(absolutePath),
          path: absolutePath,
          cid,
        },
      ],
    };
  }

  return {
    src: formatImageUrl(imagePath),
    attachments: [],
  };
};

const formatOrderNumber = (orderId = "") => `#${String(orderId).slice(-6).toUpperCase()}`;

const wrapBrandedEmail = ({ subject = "STAPS update", html = "" }) => {
  const logoUrl = `${env.clientUrl}/favicon.svg`;
  const year = new Date().getFullYear();

  return `
    <div style="margin: 0; padding: 28px 12px; background: linear-gradient(135deg, #edf0ff 0%, #f7fbff 45%, #f5f8ef 100%);">
      <div style="display: none; max-height: 0; overflow: hidden; opacity: 0;">
        ${subject}
      </div>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 660px; margin: 0 auto; border-collapse: separate;">
        <tr>
          <td style="padding: 0;">
            <div style="border-radius: 28px; overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.7); box-shadow: 0 24px 56px rgba(30, 42, 70, 0.14); background: #ffffff;">
              <div style="padding: 26px 28px; background: linear-gradient(120deg, #6f54ef 0%, #8ea6ff 55%, #6dddc2 100%);">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td style="vertical-align: middle;">
                      <img src="${logoUrl}" alt="STAPS logo" width="44" height="44" style="display: block; width: 44px; height: 44px; border-radius: 12px;" />
                    </td>
                    <td style="padding-left: 14px; vertical-align: middle;">
                      <p style="margin: 0; font-family: 'Segoe UI', Arial, sans-serif; font-size: 18px; font-weight: 800; color: #ffffff; letter-spacing: 0.02em;">
                        STAPS
                      </p>
                      <p style="margin: 4px 0 0; font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; font-weight: 600; color: rgba(255, 255, 255, 0.9); text-transform: uppercase; letter-spacing: 0.12em;">
                        Campus marketplace
                      </p>
                    </td>
                    <td style="text-align: right; vertical-align: middle;">
                      <span style="display: inline-block; border-radius: 999px; padding: 7px 12px; background: rgba(255, 255, 255, 0.18); font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; font-weight: 700; color: rgba(255, 255, 255, 0.95);">
                        ${subject}
                      </span>
                    </td>
                  </tr>
                </table>
              </div>
              <div style="padding: 28px; font-family: 'Segoe UI', Arial, sans-serif; color: #1f2937; line-height: 1.65;">
                ${html}
              </div>
              <div style="padding: 0 28px 24px; font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #6b7280;">
                <p style="margin: 0;">STAPS Marketplace &middot; Trusted campus commerce</p>
                <p style="margin: 8px 0 0;">&copy; ${year} STAPS. All rights reserved.</p>
              </div>
            </div>
          </td>
        </tr>
      </table>
    </div>
  `;
};

export const sendWelcomeEmail = async ({
  to,
  name,
  username,
  role,
  avatarUrl,
}) => {
  const greeting = name?.trim() || "there";
  const image = resolveEmailImage(avatarUrl, `welcome-avatar-${Date.now()}@staps`);
  const dashboardUrl = role === "vendor" ? `${env.clientUrl}/vendor` : `${env.clientUrl}/dashboard`;
  const roleLabel = role === "vendor" ? "vendor" : "shopper";
  const roleCopy =
    role === "vendor"
      ? "Your seller account is ready. You can now complete onboarding, set up payout details, and start listing products once approved."
      : "Your shopper account is ready. You can now track orders, manage reviews, and browse campus products with escrow protection.";

  await sendMail({
    from: env.mailFrom,
    to,
    subject: `Welcome to STAPS, ${greeting}`,
    attachments: image.attachments,
    text: [
      `Hello ${greeting},`,
      "",
      `Welcome to STAPS. Your ${roleLabel} account has been created successfully.`,
      `Nickname: @${username || "not-set"}`,
      roleCopy,
      "",
      `Open your dashboard: ${dashboardUrl}`,
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 640px;">
        <p>Hello ${greeting},</p>
        <p>Welcome to <strong>STAPS</strong>. Your ${roleLabel} account has been created successfully.</p>
        <div style="border: 1px solid #e5e7eb; border-radius: 20px; padding: 20px; margin: 24px 0; background: #ffffff;">
          <div style="display: flex; gap: 16px; align-items: center;">
            ${
              image.src
                ? `<img src="${image.src}" alt="${greeting}" style="width: 76px; height: 76px; border-radius: 18px; object-fit: cover; background: #f3f4f6;" />`
                : `<div style="width: 76px; height: 76px; border-radius: 18px; display: flex; align-items: center; justify-content: center; background: #eef2ff; color: #5a49d6; font-size: 26px; font-weight: 700;">${greeting
                    .slice(0, 1)
                    .toUpperCase()}</div>`
            }
            <div>
              <p style="margin: 0; font-size: 22px; font-weight: 700;">${greeting}</p>
              <p style="margin: 6px 0 0; color: #6b7280;">Nickname: <strong>@${username || "not-set"}</strong></p>
              <p style="margin: 6px 0 0; color: #6b7280; text-transform: capitalize;">Account type: ${roleLabel}</p>
            </div>
          </div>
          <p style="margin: 18px 0 0;">${roleCopy}</p>
        </div>
        <p>
          <a href="${dashboardUrl}" style="display: inline-block; background: #6e54ef; color: #ffffff; text-decoration: none; padding: 12px 18px; border-radius: 999px; font-weight: 700;">
            Open your dashboard
          </a>
        </p>
      </div>
    `,
  });
};

export const sendVendorNewOrderEmail = async ({
  to,
  vendorName,
  shopperName,
  productName,
  productImage,
  amountPaid,
  quantity,
  deliveryDetails,
  orderId,
}) => {
  const greeting = vendorName?.trim() || "vendor";
  const image = resolveEmailImage(productImage, `order-product-${Date.now()}@staps`);
  const dashboardUrl = `${env.clientUrl}/vendor`;
  const orderNumber = formatOrderNumber(orderId);

  await sendMail({
    from: env.mailFrom,
    to,
    subject: `New STAPS order ${orderNumber}: ${productName}`,
    attachments: image.attachments,
    text: [
      `Hello ${greeting},`,
      "",
      `You have received a new paid order on STAPS (${orderNumber}).`,
      `Product: ${productName}`,
      `Quantity: ${quantity}`,
      `Amount paid: NGN ${Number(amountPaid || 0).toLocaleString()}`,
      `Shopper: ${shopperName}`,
      `Recipient: ${deliveryDetails?.recipientName || "N/A"}`,
      `Phone: ${deliveryDetails?.phone || "N/A"}`,
      `Location: ${deliveryDetails?.location || "N/A"}`,
      `Address: ${deliveryDetails?.address || "N/A"}`,
      deliveryDetails?.notes ? `Notes: ${deliveryDetails.notes}` : null,
      "",
      `Open your vendor dashboard: ${dashboardUrl}`,
    ]
      .filter(Boolean)
      .join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 640px;">
        <p>Hello ${greeting},</p>
        <p>You have received a new paid order on STAPS <strong>${orderNumber}</strong>.</p>
        <div style="border: 1px solid #e5e7eb; border-radius: 20px; padding: 20px; margin: 24px 0;">
          <div style="display: flex; gap: 16px; align-items: flex-start;">
            ${
              image.src
                ? `<img src="${image.src}" alt="${productName}" style="width: 84px; height: 84px; border-radius: 16px; object-fit: cover; background: #f3f4f6;" />`
                : ""
            }
            <div>
              <p style="margin: 0 0 8px; font-size: 20px; font-weight: 700;">${productName}</p>
              <p style="margin: 0; color: #4b5563;">Quantity: ${quantity}</p>
              <p style="margin: 6px 0 0; color: #ea6b2d; font-weight: 700;">Amount paid: NGN ${Number(amountPaid || 0).toLocaleString()}</p>
            </div>
          </div>
          <div style="margin-top: 18px; padding-top: 18px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0 0 8px; font-weight: 700;">Delivery details</p>
            <p style="margin: 0;">Shopper: ${shopperName}</p>
            <p style="margin: 4px 0 0;">Recipient: ${deliveryDetails?.recipientName || "N/A"}</p>
            <p style="margin: 4px 0 0;">Phone: ${deliveryDetails?.phone || "N/A"}</p>
            <p style="margin: 4px 0 0;">Location: ${deliveryDetails?.location || "N/A"}</p>
            <p style="margin: 4px 0 0;">Address: ${deliveryDetails?.address || "N/A"}</p>
            ${
              deliveryDetails?.notes
                ? `<p style="margin: 4px 0 0;">Notes: ${deliveryDetails.notes}</p>`
                : ""
            }
          </div>
        </div>
        <p>
          <a href="${dashboardUrl}" style="display: inline-block; background: #ea6b2d; color: #ffffff; text-decoration: none; padding: 12px 18px; border-radius: 999px; font-weight: 700;">
            Open vendor dashboard
          </a>
        </p>
      </div>
    `,
  });
};

export const sendShopperOrderStatusEmail = async ({
  to,
  shopperName,
  productName,
  productImage,
  orderId,
  status,
  estimatedDeliveryWindow,
}) => {
  const greeting = shopperName?.trim() || "there";
  const image = resolveEmailImage(productImage, `shopper-order-${Date.now()}@staps`);
  const orderNumber = formatOrderNumber(orderId);
  const dashboardUrl = `${env.clientUrl}/dashboard`;
  const statusCopy = {
    processing: {
      subject: `STAPS order ${orderNumber} confirmed by vendor`,
      lead: `Your package with order number ${orderNumber} has been confirmed by the vendor and shipping is being processed.`,
    },
    shipped: {
      subject: `STAPS order ${orderNumber} has been shipped`,
      lead: `Hello ${greeting}, your package with order number ${orderNumber} has been shipped.`,
    },
    delivered: {
      subject: `STAPS order ${orderNumber} marked as delivered`,
      lead: `Hello ${greeting}, your package with order number ${orderNumber} has been marked as delivered.`,
    },
  }[status];

  if (!statusCopy) {
    return;
  }

  await sendMail({
    from: env.mailFrom,
    to,
    subject: statusCopy.subject,
    attachments: image.attachments,
    text: [
      `Hello ${greeting},`,
      "",
      statusCopy.lead,
      `Product: ${productName}`,
      estimatedDeliveryWindow ? `Estimated delivery date: ${estimatedDeliveryWindow}` : null,
      status === "delivered"
        ? "Please check your STAPS dashboard and confirm delivery once you have received it."
        : null,
      "",
      `Track your order here: ${dashboardUrl}`,
    ]
      .filter(Boolean)
      .join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 640px;">
        <p>Hello ${greeting},</p>
        <p>${statusCopy.lead}</p>
        <div style="border: 1px solid #e5e7eb; border-radius: 20px; padding: 20px; margin: 24px 0;">
          <div style="display: flex; gap: 16px; align-items: flex-start;">
            ${
              image.src
                ? `<img src="${image.src}" alt="${productName}" style="width: 84px; height: 84px; border-radius: 16px; object-fit: cover; background: #f3f4f6;" />`
                : ""
            }
            <div>
              <p style="margin: 0 0 8px; font-size: 20px; font-weight: 700;">${productName}</p>
              <p style="margin: 0; color: #4b5563;">Order number: ${orderNumber}</p>
              ${
                estimatedDeliveryWindow
                  ? `<p style="margin: 6px 0 0; color: #ea6b2d; font-weight: 700;">Estimated delivery date: ${estimatedDeliveryWindow}</p>`
                  : ""
              }
            </div>
          </div>
        </div>
        ${
          status === "delivered"
            ? `<p>Please check your STAPS dashboard and confirm delivery once you have received it.</p>`
            : ""
        }
        <p>
          <a href="${dashboardUrl}" style="display: inline-block; background: #ea6b2d; color: #ffffff; text-decoration: none; padding: 12px 18px; border-radius: 999px; font-weight: 700;">
            Track your order
          </a>
        </p>
      </div>
    `,
  });
};

export const sendChatMessageEmail = async ({
  to,
  recipientName,
  senderName,
  senderRole,
  messageBody,
  senderProfileId,
}) => {
  const greeting = recipientName?.trim() || "there";
  const senderLabel = senderRole === "vendor" ? "vendor" : "shopper";
  const chatUrl = `${env.clientUrl}/profiles/${senderProfileId}`;

  await sendMail({
    from: env.mailFrom,
    to,
    subject: `New STAPS message from ${senderName}`,
    text: [
      `Hello ${greeting},`,
      "",
      `You have a new message from ${senderName} on STAPS.`,
      `Sender type: ${senderLabel}`,
      "",
      `Message preview: ${messageBody}`,
      "",
      `Reply here: ${chatUrl}`,
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 640px;">
        <p>Hello ${greeting},</p>
        <p>You have a new message from <strong>${senderName}</strong> on STAPS.</p>
        <div style="border: 1px solid #e5e7eb; border-radius: 20px; padding: 20px; margin: 24px 0; background: #ffffff;">
          <p style="margin: 0; color: #6b7280; text-transform: capitalize;">Sender type: ${senderLabel}</p>
          <p style="margin: 14px 0 0; font-weight: 700;">Message preview</p>
          <p style="margin: 8px 0 0; color: #374151;">${messageBody}</p>
        </div>
        <p>
          <a href="${chatUrl}" style="display: inline-block; background: #6e54ef; color: #ffffff; text-decoration: none; padding: 12px 18px; border-radius: 999px; font-weight: 700;">
            Open chat
          </a>
        </p>
      </div>
    `,
  });
};

export const sendMailingRestoredEmail = async ({ to, name }) => {
  const greeting = name?.trim() || "there";
  const homeUrl = env.clientUrl;

  await sendMail({
    from: env.mailFrom,
    to,
    subject: "STAPS email updates are back online",
    text: [
      `Hello ${greeting},`,
      "",
      "STAPS email notifications are back online.",
      "You can now receive signup pins, password reset codes, order updates, and chat alerts again.",
      "",
      `Visit STAPS: ${homeUrl}`,
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 640px;">
        <p>Hello ${greeting},</p>
        <p><strong>STAPS</strong> email notifications are back online.</p>
        <p>You can now receive signup pins, password reset codes, order updates, and chat alerts again.</p>
        <p>
          <a href="${homeUrl}" style="display: inline-block; background: #6e54ef; color: #ffffff; text-decoration: none; padding: 12px 18px; border-radius: 999px; font-weight: 700;">
            Open STAPS
          </a>
        </p>
      </div>
    `,
  });
};
