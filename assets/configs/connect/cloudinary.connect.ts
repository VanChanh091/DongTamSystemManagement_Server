import dotenv from "dotenv";
dotenv.config();

import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

console.log("--- CHECK CLOUDINARY CONFIG ---");
console.log("Cloud Name:", process.env.CLOUDINARY_CLOUD_NAME);
console.log("API Key:", process.env.CLOUDINARY_API_KEY);
// Chỉ log 6 ký tự cuối của Secret để bảo mật
const secret = process.env.CLOUDINARY_API_SECRET || "";
console.log("API Secret (6 cuối):", secret.substring(secret.length - 6));
console.log("-------------------------------");

export default cloudinary;
