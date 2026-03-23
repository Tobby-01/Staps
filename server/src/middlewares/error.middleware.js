export const notFoundMiddleware = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`,
  });
};

export const errorMiddleware = (error, _req, res, _next) => {
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || "Internal server error",
    details: error.details || undefined,
  });
};

