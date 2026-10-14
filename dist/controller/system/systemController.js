"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCloudinarySignature = exports.cleanAllForeignKeysDb = void 0;
const clearFkService_1 = require("../../service/system/clearFkService");
const cloudinary_connect_1 = __importDefault(require("../../assets/configs/connect/cloudinary.connect"));
const cleanAllForeignKeysDb = async (req, res, next) => {
    try {
        const response = await (0, clearFkService_1.cleanAllForeignKeys)();
        return res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.cleanAllForeignKeysDb = cleanAllForeignKeysDb;
//===============================CLOUDINARY IMAGE=====================================
const getCloudinarySignature = async (req, res) => {
    const { CLOUDINARY_API_SECRET, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY } = process.env;
    // Kiểm tra xem các biến môi trường có tồn tại không
    if (!CLOUDINARY_API_SECRET || !CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY) {
        return res.status(500).json({
            message: "Cloudinary configuration is missing in environment variables",
        });
    }
    const timestamp = Math.round(new Date().getTime() / 1000);
    const folder = "orders";
    // Bây giờ TypeScript sẽ biết chắc chắn CLOUDINARY_API_SECRET là string
    const signature = cloudinary_connect_1.default.utils.api_sign_request({ timestamp, folder }, CLOUDINARY_API_SECRET);
    return res.json({
        signature,
        timestamp,
        cloudName: CLOUDINARY_CLOUD_NAME,
        apiKey: CLOUDINARY_API_KEY,
        folder,
    });
};
exports.getCloudinarySignature = getCloudinarySignature;
//# sourceMappingURL=systemController.js.map