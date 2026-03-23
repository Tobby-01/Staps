import { env } from "../config/env.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/api-error.js";
import { verifyToken } from "../utils/jwt.js";

export const authMiddleware = async (req, _res, next) => {
  try {
    const bearerToken = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.split(" ")[1]
      : null;
    const token = req.cookies[env.cookieName] || bearerToken;

    if (!token) {
      return next(new ApiError(401, "Authentication required"));
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.sub).select("-password");

    if (!user) {
      return next(new ApiError(401, "User not found"));
    }

    req.user = user;
    next();
  } catch (_error) {
    next(new ApiError(401, "Invalid or expired token"));
  }
};

export const authorizeRoles = (...roles) => (req, _res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new ApiError(403, "You do not have permission to perform this action."));
  }

  next();
};

