import { Router } from "express";
import { getAllDataBox, getAllDataPaper } from "../../controller/dashboard/dashboard.js";
import authenticate from "../../middlewares/authMiddleware.js";

const router = Router();

router.get("/paper", authenticate, getAllDataPaper);
router.get("/box", authenticate, getAllDataBox);

export default router;
