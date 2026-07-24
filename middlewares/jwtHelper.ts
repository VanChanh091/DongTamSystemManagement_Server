import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { UserPayload } from "../interface/socket.type";
dotenv.config();

const generateToken = (user: UserPayload): string => {
  const key =
    process.env.NODE_ENV === "development"
      ? process.env.SECRET_KEY_DEV
      : process.env.SECRET_KEY_PROD;

  return jwt.sign(
    { userId: user.userId, role: user.role, department: user.department },
    key as string,
    { expiresIn: "1d" },
  );
};

export default generateToken;
