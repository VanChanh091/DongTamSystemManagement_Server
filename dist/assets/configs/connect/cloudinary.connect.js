"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const cloudinary_1 = require("cloudinary");
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
// console.log("--- CHECK CLOUDINARY CONFIG ---");
// console.log("Cloud Name:", process.env.CLOUDINARY_CLOUD_NAME);
// console.log("API Key:", process.env.CLOUDINARY_API_KEY);
// // Chỉ log 6 ký tự cuối của Secret để bảo mật
// const secret = process.env.CLOUDINARY_API_SECRET || "";
// console.log("API Secret (6 cuối):", secret.substring(secret.length - 6));
// console.log("-------------------------------");
exports.default = cloudinary_1.v2;
//# sourceMappingURL=cloudinary.connect.js.map