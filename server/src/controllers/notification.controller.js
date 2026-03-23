import { Notification } from "../models/notification.model.js";
import { asyncHandler } from "../utils/async-handler.js";

export const listNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ recipient: req.user.id }).sort({ createdAt: -1 });

  res.json({
    success: true,
    notifications,
  });
});

export const markNotificationRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({
    _id: req.params.id,
    recipient: req.user.id,
  });

  if (!notification) {
    return res.status(404).json({
      success: false,
      message: "Notification not found.",
    });
  }

  notification.read = true;
  await notification.save();

  res.json({
    success: true,
    notification,
  });
});

