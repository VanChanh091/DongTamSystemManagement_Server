import { Router } from "express";
import authenticate from "../../middlewares/authMiddleware.js";
import { getAllDataBox, getAllDataPaper } from "../../controller/dashboard/dashboard.js";

const router = Router();

router.get("/paper", authenticate, getAllDataPaper);
router.get("/box", authenticate, getAllDataBox);

export default router;
