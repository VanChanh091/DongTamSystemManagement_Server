import jwt from "jsonwebtoken";
import User from "../models/user/user.js";
import dotenv from "dotenv";
dotenv.config();

const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    const key =
      process.env.NODE_ENV === "development"
        ? process.env.SECRET_KEY_DEV
        : process.env.SECRET_KEY_PROD;

    const decoded = jwt.verify(token, key);
    const user = await User.findByPk(decoded.userId);
    if (!user) return res.status(401).json({ message: "User not found" });

    req.user = {
      userId: user.userId,
      role: user.role,
      permissions: user.permissions,
      email: user.email,
    };

    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

export default authenticate;
