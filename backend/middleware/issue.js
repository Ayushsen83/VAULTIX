
function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    message: "API endpoint not found.",
  });
}

function errorHandler(err, req, res, next) {
  // If the response has already started, delegate to Express.
  if (res.headersSent) {
    return next(err);
  }

  // Log details on the server, not in the API response.
  console.error("API error:", {
    method: req.method,
    path: req.originalUrl,
    message: err.message,
    status: err.status || err.statusCode || 500,
  });

  const statusCode =
    Number.isInteger(err.statusCode) &&
    err.statusCode >= 400 &&
    err.statusCode <= 599
      ? err.statusCode
      : Number.isInteger(err.status) &&
          err.status >= 400 &&
          err.status <= 599
        ? err.status
        : 500;

  // Do not expose internal errors to clients.
  const message =
    statusCode >= 500
      ? "An unexpected server error occurred."
      : err.publicMessage || err.message || "Request failed.";

  return res.status(statusCode).json({
    success: false,
    message,
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
