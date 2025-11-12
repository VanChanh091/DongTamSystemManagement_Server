"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCloudinaryPublicId = exports.uploadImageToCloudinary = exports.convertToWebp = void 0;
const sharp_1 = __importDefault(require("sharp"));
const streamifier_1 = __importDefault(require("streamifier"));
const connectCloudinary_1 = __importDefault(require("../../configs/connectCloudinary"));
const convertToWebp = async (buffer, quality = 80) => {
    try {
        const webpBuffer = await (0, sharp_1.default)(buffer).webp({ quality }).toBuffer();
        return webpBuffer;
    }
    catch (error) {
        throw new Error("Lỗi khi chuyển ảnh sang WebP: " + error.message);
    }
};
exports.convertToWebp = convertToWebp;
const uploadImageToCloudinary = (buffer, folder = "products", publicId = "") => new Promise((resolve, reject) => {
    const uploadStream = connectCloudinary_1.default.uploader.upload_stream({
        folder,
        public_id: publicId,
        resource_type: "image",
    }, (error, result) => {
        if (result)
            resolve(result);
        else
            reject(error);
    });
    streamifier_1.default.createReadStream(buffer).pipe(uploadStream);
});
exports.uploadImageToCloudinary = uploadImageToCloudinary;
const getCloudinaryPublicId = (url) => {
    try {
        const parts = url.split("/");
        const filename = parts.pop();
        const folder = parts.pop();
        if (!filename || !folder)
            return null;
        const publicId = `${folder}/${filename.split(".")[0]}`;
        return publicId;
    }
    catch {
        return null;
    }
};
exports.getCloudinaryPublicId = getCloudinaryPublicId;
//# sourceMappingURL=converToWebp.js.map