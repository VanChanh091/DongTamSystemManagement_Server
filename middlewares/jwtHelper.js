import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const generateToken = (user) => {
  return jwt.sign({ id: user.id, role: user.role }, process.env.SECRET_KEY, {
    expiresIn: "1d",
  });
};

export default generateToken;
