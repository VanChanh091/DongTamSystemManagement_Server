import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import dotenv from "dotenv";
import { User } from "../models/user/user";
dotenv.config();

interface DecodedToken extends JwtPayload {
  userId: number;
}

// Mở rộng type cho Request để có thể gán req.user

const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    const key =
      process.env.NODE_ENV === "development"
        ? process.env.SECRET_KEY_DEV
        : process.env.SECRET_KEY_PROD;

    const decoded = jwt.verify(token, key as string) as DecodedToken;

    const user = await User.findByPk(decoded.userId);
    if (!user) return res.status(401).json({ message: "User not found" });

    req.user = {
      userId: user.userId,
      role: user.role,
      permissions: user.permissions,
      email: user.email,
    };

    next();
  } catch (err: any) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired" });
    }
    return res.status(401).json({ message: "Invalid token" });
  }
};

export default authenticate;
