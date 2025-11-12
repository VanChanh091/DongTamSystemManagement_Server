"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
const user_1 = require("../models/user/user");
dotenv_1.default.config();
// Mở rộng type cho Request để có thể gán req.user
const authenticate = async (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token)
        return res.status(401).json({ message: "No token provided" });
    try {
        const key = process.env.NODE_ENV === "development"
            ? process.env.SECRET_KEY_DEV
            : process.env.SECRET_KEY_PROD;
        const decoded = jsonwebtoken_1.default.verify(token, key);
        const user = await user_1.User.findByPk(decoded.userId);
        if (!user)
            return res.status(401).json({ message: "User not found" });
        req.user = {
            userId: user.userId,
            role: user.role,
            permissions: user.permissions,
            email: user.email,
        };
        next();
    }
    catch (err) {
        if (err.name === "TokenExpiredError") {
            return res.status(401).json({ message: "Token expired" });
        }
        return res.status(401).json({ message: "Invalid token" });
    }
};
exports.default = authenticate;
//# sourceMappingURL=authMiddleware.js.map