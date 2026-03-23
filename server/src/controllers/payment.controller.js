import { asyncHandler } from "../utils/async-handler.js";

import { finalizePaystackPayment } from "../services/payment.service.js";

export const verifyPaymentReference = asyncHandler(async (req, res) => {
  const { reference } = req.params;
  const result = await finalizePaystackPayment(reference);

  res.json({
    success: true,
    ...result,
  });
});
