import { User } from "../models/user.model.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";

export const getPublicUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select("name username role avatarUrl createdAt");

  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  res.json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    },
  });
});
