const errorMiddlewareHandle = (err, req, res, next) => {
  const statusCode = err.status || 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
    stack: process.env.NODE_ENV === "production" ? err.stack : null, // Ẩn stack trace nếu ở chế độ production
  });
};

export default errorMiddlewareHandle;
