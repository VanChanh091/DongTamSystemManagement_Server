import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const generateToken = (user) => {
  return jwt.sign(
    { userId: user.userId, role: user.role },
    process.env.SECRET_KEY,
    {
      expiresIn: "1d",
    }
  );
};

export default generateToken;
