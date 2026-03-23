import { Notification } from "../models/notification.model.js";

export const createNotification = async ({ recipient, type, title, message, metadata = {} }) =>
  Notification.create({
    recipient,
    type,
    title,
    message,
    metadata,
  });

export const createBulkNotifications = async (payloads) => {
  if (!payloads.length) {
    return [];
  }

  return Notification.insertMany(payloads);
};

