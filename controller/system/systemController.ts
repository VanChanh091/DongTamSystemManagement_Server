import { NextFunction, Request, Response } from "express";
import { cleanAllForeignKeys } from "../../service/system/clearFkService";
import cloudinary from "../../assets/configs/connect/cloudinary.connect";

export const cleanAllForeignKeysDb = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await cleanAllForeignKeys();
    return res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

//===============================CLOUDINARY IMAGE=====================================
export const getCloudinarySignature = async (req: Request, res: Response) => {
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
  const signature = cloudinary.utils.api_sign_request({ timestamp, folder }, CLOUDINARY_API_SECRET);

  return res.json({
    signature,
    timestamp,
    cloudName: CLOUDINARY_CLOUD_NAME,
    apiKey: CLOUDINARY_API_KEY,
    folder,
  });
};
