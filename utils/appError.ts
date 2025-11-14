export class AppError extends Error {
  public readonly statusCode: number;
  public readonly status: "fail" | "error";
  public readonly isOperational: boolean;
  public readonly errorCode?: string;

  constructor(message: string, statusCode: number, errorCode?: string, isOperational = true) {
    super(message);

    this.statusCode = statusCode;
    this.status = statusCode >= 500 ? "error" : "fail";
    this.isOperational = isOperational;
    this.errorCode = errorCode;

    Object.setPrototypeOf(this, new.target.prototype);

    Error.captureStackTrace(this, this.constructor);
  }

  // 🚫 400 – Bad Request
  // Client gửi request sai format, thiếu params, validation fail.

  // 🚫 401 – Unauthorized
  // Client chưa đăng nhập.

  // 🚫 403 – Forbidden
  // Client đăng nhập nhưng không có quyền.

  // 🚫 404 – Not Found
  // Không tìm thấy tài nguyên (order, user, product, machine…)

  // 🚫 409 – Conflict
  // Dữ liệu bị trùng / mâu thuẫn.

  static BadRequest(message = "Bad request", errorCode?: string) {
    return new AppError(message, 400, errorCode);
  }

  static Unauthorized(message = "Unauthorized", errorCode?: string) {
    return new AppError(message, 401, errorCode);
  }

  static Forbidden(message = "Forbidden", errorCode?: string) {
    return new AppError(message, 403, errorCode);
  }

  static NotFound(message = "Not found", errorCode?: string) {
    return new AppError(message, 404, errorCode);
  }

  static Conflict(message = "Conflict", errorCode?: string) {
    return new AppError(message, 409, errorCode);
  }

  static ServerError(message = "Server error", errorCode?: string) {
    return new AppError(message, 500, errorCode, false);
  }
}
