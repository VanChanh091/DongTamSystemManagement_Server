import jwt from "jsonwebtoken";
import User from "../models/user/user.js";
import dotenv from "dotenv";
dotenv.config();

const errorMiddlewareHandle = (err, req, res, next) => {
  const statusCode = err.status || 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
    stack: process.env.NODE_ENV === "production" ? err.stack : null, // Ẩn stack trace nếu ở chế độ production
  });
};

// const errorMiddlewareHandle = async (req, res, next) => {
//   const token = req.headers.authorization?.split(" ")[1];
//   console.log("token", token);
//   console.log("env", process.env.SECRET_KEY);

//   if (!token) {
//     return res.status(401).json({ message: "No token, authorization denied" });
//   }

//   try {
//     const decoded = jwt.verify(token, process.env.SECRET_KEY);
//     const user = await User.findByPk(decoded.id, {
//       attributes: { exclude: ["password"] }, // Loại bỏ password khỏi kết quả trả về
//     });

//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     req.user = user;
//     next();
//   } catch (error) {
//     console.error("Token verification failed", error);
//     res.status(401).json({ message: "Invalid token" });
//   }
// };

export default errorMiddlewareHandle;
