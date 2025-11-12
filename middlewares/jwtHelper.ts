import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

interface UserPayload {
  userId: number;
  role: string;
}

const generateToken = (user: UserPayload): string => {
  const key =
    process.env.NODE_ENV === "development"
      ? process.env.SECRET_KEY_DEV
      : process.env.SECRET_KEY_PROD;

  return jwt.sign({ userId: user.userId, role: user.role }, key as string, {
    expiresIn: "1d",
  });
};

export default generateToken;
