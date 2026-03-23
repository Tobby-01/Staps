import { ROLES } from "../constants/roles.js";
import { ApiError } from "../utils/api-error.js";

export const isAdmin = (req, _res, next) => {
  if (!req.user || req.user.role !== ROLES.ADMIN) {
    return next(new ApiError(403, "Admin access only"));
  }

  next();
};

