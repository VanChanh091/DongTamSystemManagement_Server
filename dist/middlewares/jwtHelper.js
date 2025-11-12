"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const generateToken = (user) => {
    const key = process.env.NODE_ENV === "development"
        ? process.env.SECRET_KEY_DEV
        : process.env.SECRET_KEY_PROD;
    return jsonwebtoken_1.default.sign({ userId: user.userId, role: user.role }, key, {
        expiresIn: "1d",
    });
};
exports.default = generateToken;
//# sourceMappingURL=jwtHelper.js.map