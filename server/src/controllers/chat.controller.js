import { ROLES } from "../constants/roles.js";
import { Conversation } from "../models/conversation.model.js";
import { Message } from "../models/message.model.js";
import { Order } from "../models/order.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import { sendChatMessageEmail } from "../services/mail.service.js";
import { createNotification } from "../services/notification.service.js";

const resolveChatPair = async (currentUser, otherUserId) => {
  const otherUser = await User.findById(otherUserId).select("name username role avatarUrl email");
  if (!otherUser) {
    throw new ApiError(404, "User not found.");
  }

  const allowedRoles = [ROLES.USER, ROLES.VENDOR];
  if (!allowedRoles.includes(currentUser.role) || !allowedRoles.includes(otherUser.role)) {
    throw new ApiError(403, "Chat is only available between shoppers and vendors.");
  }

  if (currentUser.role === otherUser.role) {
    throw new ApiError(403, "Chat is only available between shoppers and vendors.");
  }

  const shopperId =
    currentUser.role === ROLES.USER ? currentUser.id : otherUser.id;
  const vendorId =
    currentUser.role === ROLES.VENDOR ? currentUser.id : otherUser.id;

  const hasOrderRelationship = await Order.exists({
    user: shopperId,
    vendor: vendorId,
  });

  if (!hasOrderRelationship) {
    throw new ApiError(403, "You can only chat after an order relationship exists.");
  }

  return { otherUser, shopperId, vendorId };
};

const getConversationPayload = async (conversationId, currentUserId) => {
  const messages = await Message.find({ conversation: conversationId })
    .sort({ createdAt: 1 })
    .populate("sender", "name username avatarUrl role")
    .lean();

  await Message.updateMany(
    {
      conversation: conversationId,
      recipient: currentUserId,
      readAt: { $exists: false },
    },
    { $set: { readAt: new Date() } },
  );

  return messages.map((message) => ({
    id: message._id,
    body: message.body,
    createdAt: message.createdAt,
    readAt: message.readAt,
    sender: {
      id: message.sender?._id,
      name: message.sender?.name,
      username: message.sender?.username,
      avatarUrl: message.sender?.avatarUrl,
      role: message.sender?.role,
    },
  }));
};

export const getChatThread = asyncHandler(async (req, res) => {
  const { otherUser, shopperId, vendorId } = await resolveChatPair(req.user, req.params.userId);

  let conversation = await Conversation.findOne({ shopper: shopperId, vendor: vendorId });
  if (!conversation) {
    conversation = await Conversation.create({
      shopper: shopperId,
      vendor: vendorId,
    });
  }

  const messages = await getConversationPayload(conversation.id, req.user.id);

  res.json({
    success: true,
    conversation: {
      id: conversation.id,
      shopper: shopperId,
      vendor: vendorId,
    },
    participant: {
      id: otherUser.id,
      name: otherUser.name,
      username: otherUser.username,
      avatarUrl: otherUser.avatarUrl,
      role: otherUser.role,
    },
    messages,
  });
});

export const sendChatMessage = asyncHandler(async (req, res) => {
  const body = req.body.body?.trim();
  if (!body) {
    throw new ApiError(400, "Message body is required.");
  }

  const { otherUser, shopperId, vendorId } = await resolveChatPair(req.user, req.params.userId);

  let conversation = await Conversation.findOne({ shopper: shopperId, vendor: vendorId });
  if (!conversation) {
    conversation = await Conversation.create({
      shopper: shopperId,
      vendor: vendorId,
    });
  }

  const message = await Message.create({
    conversation: conversation.id,
    sender: req.user.id,
    recipient: otherUser.id,
    body,
  });

  conversation.lastMessageAt = message.createdAt;
  await conversation.save();

  await createNotification({
    recipient: otherUser.id,
    type: "chat_message",
    title: "New message on STAPS",
    message: `${req.user.name} sent you a message.`,
    metadata: {
      conversationId: conversation.id,
      senderId: req.user.id,
    },
  });

  try {
    if (otherUser.email) {
      await sendChatMessageEmail({
        to: otherUser.email,
        recipientName: otherUser.name,
        senderName: req.user.name,
        senderRole: req.user.role,
        messageBody: body,
        senderProfileId: req.user.id,
      });
    }
  } catch (error) {
    console.error("Failed to send chat message email");
    console.error(error);
  }

  const populatedMessage = await Message.findById(message.id)
    .populate("sender", "name username avatarUrl role")
    .lean();

  res.status(201).json({
    success: true,
    message: {
      id: populatedMessage._id,
      body: populatedMessage.body,
      createdAt: populatedMessage.createdAt,
      sender: {
        id: populatedMessage.sender?._id,
        name: populatedMessage.sender?.name,
        username: populatedMessage.sender?.username,
        avatarUrl: populatedMessage.sender?.avatarUrl,
        role: populatedMessage.sender?.role,
      },
    },
  });
});
