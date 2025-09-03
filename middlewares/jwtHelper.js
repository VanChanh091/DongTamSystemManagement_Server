import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const generateToken = (user) => {
  const key =
    process.env.NODE_ENV === "development"
      ? process.env.SECRET_KEY_DEV
      : process.env.SECRET_KEY_PROD;

  return jwt.sign({ userId: user.userId, role: user.role }, key, {
    expiresIn: "1d",
  });
};

export default generateToken;
