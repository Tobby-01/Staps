import mongoose from "mongoose";

import { connectDatabase } from "../config/database.js";
import { VENDOR_SELLING_STATUS } from "../constants/vendor.js";
import { Conversation } from "../models/conversation.model.js";
import { Follow } from "../models/follow.model.js";
import { Message } from "../models/message.model.js";
import { Notification } from "../models/notification.model.js";
import { Order } from "../models/order.model.js";
import { Product } from "../models/product.model.js";
import { Review } from "../models/review.model.js";
import { User } from "../models/user.model.js";
import { Vendor } from "../models/vendor.model.js";
import { WalletTransaction } from "../models/wallet-transaction.model.js";

const REQUIRED_CONFIRM_FLAG = "--confirm=staps-reset-test2";

const assertConfirmation = () => {
  if (process.argv.includes(REQUIRED_CONFIRM_FLAG)) {
    return;
  }

  console.error("Reset aborted.");
  console.error(
    `Run again with ${REQUIRED_CONFIRM_FLAG} to confirm deleting marketplace test data.`,
  );
  process.exit(1);
};

const printSummary = (summary) => {
  console.log("\nMarketplace reset completed.");
  console.table(summary);
};

const runReset = async () => {
  assertConfirmation();
  await connectDatabase();

  const now = new Date();

  const [
    productResult,
    orderResult,
    reviewResult,
    followResult,
    conversationResult,
    messageResult,
    notificationResult,
    walletTransactionResult,
    userWalletResetResult,
    vendorResetResult,
  ] = await Promise.all([
    Product.deleteMany({}),
    Order.deleteMany({}),
    Review.deleteMany({}),
    Follow.deleteMany({}),
    Conversation.deleteMany({}),
    Message.deleteMany({}),
    Notification.deleteMany({}),
    WalletTransaction.deleteMany({}),
    User.updateMany(
      {},
      {
        $set: {
          walletBalance: 0,
          "walletFundingAccount.provider": "paystack",
          "walletFundingAccount.customerCode": "",
          "walletFundingAccount.dedicatedAccountId": null,
          "walletFundingAccount.accountNumber": "",
          "walletFundingAccount.accountName": "",
          "walletFundingAccount.bankName": "",
          "walletFundingAccount.bankCode": "",
          "walletFundingAccount.currency": "NGN",
          "walletFundingAccount.active": false,
          "walletFundingAccount.assignedAt": null,
          "walletFundingAccount.lastSyncedAt": null,
        },
      },
    ),
    Vendor.updateMany(
      {},
      {
        $set: {
          verified: false,
          sellingStatus: VENDOR_SELLING_STATUS.ACTIVE,
          suspensionEndsAt: null,
          sellingRestrictionReason: "",
          sellingStatusUpdatedAt: now,
          sellingStatusUpdatedBy: null,
          paymentStatus: "pending",
          registrationReference: "",
          registrationPaidAt: null,
          "payoutAccount.bankCode": "",
          "payoutAccount.bankName": "",
          "payoutAccount.accountNumber": "",
          "payoutAccount.accountName": "",
          "payoutAccount.recipientCode": "",
          "payoutAccount.recipientId": null,
          "payoutAccount.currency": "NGN",
          "payoutAccount.setupComplete": false,
          "payoutAccount.lastSyncedAt": null,
        },
      },
    ),
  ]);

  printSummary({
    productsDeleted: productResult.deletedCount || 0,
    ordersDeleted: orderResult.deletedCount || 0,
    reviewsDeleted: reviewResult.deletedCount || 0,
    followsDeleted: followResult.deletedCount || 0,
    conversationsDeleted: conversationResult.deletedCount || 0,
    messagesDeleted: messageResult.deletedCount || 0,
    notificationsDeleted: notificationResult.deletedCount || 0,
    walletTransactionsDeleted: walletTransactionResult.deletedCount || 0,
    userWalletsReset: userWalletResetResult.modifiedCount || 0,
    vendorsReset: vendorResetResult.modifiedCount || 0,
  });
};

runReset()
  .catch((error) => {
    console.error("Marketplace reset failed.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });
