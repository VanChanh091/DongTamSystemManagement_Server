import sharp from "sharp";
import streamifier from "streamifier";
import cloudinary from "../../configs/connectCloudinary.js";

export const convertToWebp = async (buffer, quality = 80) => {
  try {
    const webpBuffer = await sharp(buffer).webp({ quality }).toBuffer();
    return webpBuffer;
  } catch (error) {
    throw new Error("Lỗi khi chuyển ảnh sang WebP: " + error.message);
  }
};

export const uploadImageToCloudinary = (
  buffer,
  folder = "products",
  publicId = ""
) =>
  new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: "image",
      },
      (error, result) => {
        if (result) resolve(result);
        else reject(error);
      }
    );

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });

export const getCloudinaryPublicId = (url) => {
  try {
    const parts = url.split("/");
    const filename = parts.pop();
    const folder = parts.pop();

    const publicId = `${folder}/${filename.split(".")[0]}`;
    return publicId;
  } catch {
    return null;
  }
};
