import { Router } from "express";
import authenticate from "../../middlewares/authMiddleware";
import { updateProfileUser } from "../../controller/user/users/userController";
import upload from "../../utils/image/uploadImage";

const router = Router();

router.put("/updateUser", authenticate, upload.single("avatar"), updateProfileUser);

export default router;
