import crypto from "crypto";

import { env } from "../config/env.js";
import { PUBLIC_SIGNUP_ROLES, ROLES } from "../constants/roles.js";
import { ADMIN_EMAILS, resolveRoleForEmail } from "../constants/admin.js";
import { User } from "../models/user.model.js";
import {
  sendPasswordResetEmail,
  sendSignupVerificationEmail,
  sendWelcomeEmail,
} from "../services/mail.service.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import { clearAuthCookie, setAuthCookie, signToken } from "../utils/jwt.js";

const sanitizeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  username: user.username,
  role: user.role,
  avatarUrl: user.avatarUrl,
  isEmailVerified: user.isEmailVerified !== false,
});

const passwordResetMessage =
  "If an account exists for this email, a password reset code has been sent.";

const hashResetCode = (code) => crypto.createHash("sha256").update(code).digest("hex");
const createVerificationCode = () => String(crypto.randomInt(1000, 10000));
const normalizeUsername = (value) => value?.trim().toLowerCase();
const assertValidUsername = (username) => {
  if (!username) {
    throw new ApiError(400, "Username is required.");
  }

  if (!/^[a-z0-9._]{3,20}$/i.test(username)) {
    throw new ApiError(
      400,
      "Username must be 3-20 characters and use only letters, numbers, periods, or underscores.",
    );
  }
};

export const signup = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  const normalizedEmail = email?.toLowerCase();
  const normalizedUsername = normalizeUsername(req.body.username);

  if (!name || !email || !password || !role || !normalizedUsername) {
    throw new ApiError(400, "Name, username, email, password, and role are required.");
  }

  if (!PUBLIC_SIGNUP_ROLES.includes(role)) {
    throw new ApiError(400, "Only shopper and vendor roles are allowed during signup.");
  }

  assertValidUsername(normalizedUsername);

  const existingUser = await User.findOne({ email: normalizedEmail }).select(
    "+emailVerificationCodeHash +emailVerificationExpiresAt",
  );
  if (existingUser && existingUser.isEmailVerified !== false) {
    throw new ApiError(409, "An account with this email already exists.");
  }

  const existingUsername = await User.findOne({ username: normalizedUsername });
  if (existingUsername && String(existingUsername._id) !== String(existingUser?._id)) {
    throw new ApiError(409, "That username is already taken.");
  }

  const verificationCode = createVerificationCode();
  const resolvedRole = resolveRoleForEmail(normalizedEmail, role);
  const avatarUrl = req.file ? `/uploads/avatars/${req.file.filename}` : existingUser?.avatarUrl;
  let user = existingUser;

  if (user) {
    user.name = name;
    user.username = normalizedUsername;
    user.email = normalizedEmail;
    user.password = password;
    user.role = resolvedRole;
    user.avatarUrl = avatarUrl;
    user.isEmailVerified = false;
    user.emailVerificationCodeHash = hashResetCode(verificationCode);
    user.emailVerificationExpiresAt = new Date(
      Date.now() + env.passwordResetCodeTtlMinutes * 60 * 1000,
    );
    await user.save();
  } else {
    user = await User.create({
      name,
      username: normalizedUsername,
      email: normalizedEmail,
      password,
      role: resolvedRole,
      avatarUrl,
      isEmailVerified: false,
      emailVerificationCodeHash: hashResetCode(verificationCode),
      emailVerificationExpiresAt: new Date(
        Date.now() + env.passwordResetCodeTtlMinutes * 60 * 1000,
      ),
    });
  }

  try {
    await sendSignupVerificationEmail({
      to: user.email,
      name: user.name,
      code: verificationCode,
    });
  } catch (error) {
    console.error("Failed to send signup verification email");
    console.error(error);
    throw new ApiError(
      503,
      "We could not send your verification pin right now. Please try again in a moment.",
    );
  }

  clearAuthCookie(res);

  res.status(201).json({
    success: true,
    requiresVerification: true,
    message: "A 4-digit verification pin has been sent to your email.",
    email: normalizedEmail,
  });
});

export const verifySignup = asyncHandler(async (req, res) => {
  const normalizedEmail = req.body.email?.trim().toLowerCase();
  const code = req.body.code?.trim();

  if (!normalizedEmail || !code) {
    throw new ApiError(400, "Email and verification pin are required.");
  }

  if (!/^\d{4}$/.test(code)) {
    throw new ApiError(400, "Verification pin must be 4 digits.");
  }

  const user = await User.findOne({ email: normalizedEmail }).select(
    "+emailVerificationCodeHash +emailVerificationExpiresAt",
  );

  if (
    !user ||
    user.isEmailVerified !== false ||
    !user.emailVerificationCodeHash ||
    !user.emailVerificationExpiresAt ||
    user.emailVerificationExpiresAt.getTime() < Date.now() ||
    user.emailVerificationCodeHash !== hashResetCode(code)
  ) {
    throw new ApiError(400, "Invalid or expired verification pin.");
  }

  user.isEmailVerified = true;
  user.emailVerificationCodeHash = undefined;
  user.emailVerificationExpiresAt = undefined;
  await user.save();

  const token = signToken({ sub: user.id, role: user.role });
  setAuthCookie(res, token);

  try {
    await sendWelcomeEmail({
      to: user.email,
      name: user.name,
      username: user.username,
      role: user.role,
      avatarUrl: user.avatarUrl,
    });
  } catch (error) {
    console.error("Failed to send signup welcome email");
    console.error(error);
  }

  res.json({
    success: true,
    message: "Email verified successfully.",
    token,
    user: sanitizeUser(user),
  });
});

export const resendSignupVerification = asyncHandler(async (req, res) => {
  const normalizedEmail = req.body.email?.trim().toLowerCase();

  if (!normalizedEmail) {
    throw new ApiError(400, "Email is required.");
  }

  const user = await User.findOne({ email: normalizedEmail }).select(
    "+emailVerificationCodeHash +emailVerificationExpiresAt",
  );

  if (!user || user.isEmailVerified !== false) {
    throw new ApiError(404, "No pending signup was found for this email.");
  }

  const verificationCode = createVerificationCode();
  user.emailVerificationCodeHash = hashResetCode(verificationCode);
  user.emailVerificationExpiresAt = new Date(
    Date.now() + env.passwordResetCodeTtlMinutes * 60 * 1000,
  );
  await user.save();

  try {
    await sendSignupVerificationEmail({
      to: user.email,
      name: user.name,
      code: verificationCode,
    });
  } catch (error) {
    console.error("Failed to resend signup verification email");
    console.error(error);
    throw new ApiError(
      503,
      "We could not resend your verification pin right now. Please try again in a moment.",
    );
  }

  res.json({
    success: true,
    message: "A new verification pin has been sent to your email.",
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = email?.toLowerCase();

  const user = await User.findOne({ email: normalizedEmail }).select("+password");
  if (!user) {
    throw new ApiError(401, "Invalid email or password.");
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid email or password.");
  }

  const resolvedRole = resolveRoleForEmail(user.email, user.role);
  if (user.role !== resolvedRole) {
    user.role = resolvedRole;
    await user.save();
  }

  const token = signToken({ sub: user.id, role: user.role });
  setAuthCookie(res, token);

  res.json({
    success: true,
    message: "Login successful",
    token,
    user: sanitizeUser(user),
  });
});

export const requestPasswordReset = asyncHandler(async (req, res) => {
  const normalizedEmail = req.body.email?.trim().toLowerCase();

  if (!normalizedEmail) {
    throw new ApiError(400, "Email is required.");
  }

  const user = await User.findOne({ email: normalizedEmail }).select(
    "+passwordResetCodeHash +passwordResetExpiresAt",
  );

  let resetCode = null;

  if (user) {
    resetCode = String(crypto.randomInt(100000, 1000000));
    user.passwordResetCodeHash = hashResetCode(resetCode);
    user.passwordResetExpiresAt = new Date(
      Date.now() + env.passwordResetCodeTtlMinutes * 60 * 1000,
    );
    await user.save();

    try {
      await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        code: resetCode,
      });
    } catch (error) {
      console.error("Failed to send password reset email");
      console.error(error);
      throw new ApiError(
        503,
        "We could not send your reset code right now. Please try again in a moment.",
      );
    }
  }

  res.json({
    success: true,
    message: passwordResetMessage,
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const normalizedEmail = req.body.email?.trim().toLowerCase();
  const resetCode = req.body.code?.trim();
  const newPassword = req.body.newPassword;

  if (!normalizedEmail || !resetCode || !newPassword) {
    throw new ApiError(400, "Email, reset code, and new password are required.");
  }

  if (String(newPassword).length < 6) {
    throw new ApiError(400, "New password must be at least 6 characters long.");
  }

  const user = await User.findOne({ email: normalizedEmail }).select(
    "+password +passwordResetCodeHash +passwordResetExpiresAt",
  );

  if (
    !user ||
    !user.passwordResetCodeHash ||
    !user.passwordResetExpiresAt ||
    user.passwordResetExpiresAt.getTime() < Date.now() ||
    user.passwordResetCodeHash !== hashResetCode(resetCode)
  ) {
    throw new ApiError(400, "Invalid or expired reset code.");
  }

  user.password = newPassword;
  user.passwordResetCodeHash = undefined;
  user.passwordResetExpiresAt = undefined;
  await user.save();

  clearAuthCookie(res);

  res.json({
    success: true,
    message: "Password reset successful. You can now log in with your new password.",
  });
});

export const me = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    user: sanitizeUser(req.user),
  });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  const nextName = req.body.name?.trim();
  const nextUsername = normalizeUsername(req.body.username);

  if (nextName) {
    user.name = nextName;
  }

  if (nextUsername && nextUsername !== user.username) {
    assertValidUsername(nextUsername);

    const existingUsername = await User.findOne({
      username: nextUsername,
      _id: { $ne: user.id },
    });

    if (existingUsername) {
      throw new ApiError(409, "That username is already taken.");
    }

    user.username = nextUsername;
  }

  if (req.file) {
    user.avatarUrl = `/uploads/avatars/${req.file.filename}`;
  }

  await user.save();

  res.json({
    success: true,
    message: "Profile updated successfully.",
    user: sanitizeUser(user),
  });
});

export const logout = asyncHandler(async (_req, res) => {
  clearAuthCookie(res);
  res.json({
    success: true,
    message: "Logged out successfully",
  });
});

export const seedAdminHint = asyncHandler(async (_req, res) => {
  res.json({
    success: true,
    message: "These internal emails are promoted to admin automatically on signup or login.",
    example: {
      emails: ADMIN_EMAILS,
      role: ROLES.ADMIN,
    },
  });
});
