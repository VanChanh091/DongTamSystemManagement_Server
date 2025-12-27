import sharp from "sharp";
import streamifier from "streamifier";
import cloudinary from "../../assest/configs/connectCloudinary";
import { AppError } from "../appError";

export const convertToWebp = async (buffer: Buffer, quality: number = 80) => {
  try {
    const webpBuffer = await sharp(buffer).webp({ quality }).toBuffer();
    return webpBuffer;
  } catch (error: any) {
    throw new AppError("Lỗi khi chuyển ảnh sang WebP: ", 400);
  }
};

export const uploadImageToCloudinary = (
  buffer: Buffer,
  folder: string = "products",
  publicId: string = ""
): Promise<{ secure_url: string }> =>
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

export const getCloudinaryPublicId = (url: string) => {
  try {
    const parts = url.split("/");
    const filename = parts.pop();
    const folder = parts.pop();

    if (!filename || !folder) return null;

    const publicId = `${folder}/${filename.split(".")[0]}`;
    return publicId;
  } catch {
    return null;
  }
};
