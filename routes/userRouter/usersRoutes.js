import { Router } from "express";
import authenticate from "../../middlewares/authMiddleware.js";
import { updateProfileUser } from "../../controller/user/users/userController.js";
import upload from "../../utils/image/uploadImage.js";

const router = Router();

router.put(
  "/updateUser",
  authenticate,
  upload.single("avatar"),
  updateProfileUser
);

export default router;
