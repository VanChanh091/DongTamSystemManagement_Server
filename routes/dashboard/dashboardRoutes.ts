import { Router } from "express";
import authenticate from "../../middlewares/authMiddleware";
import { getAllDataBox, getAllDataPaper } from "../../controller/dashboard/dashboard";

const router = Router();

router.get("/paper", authenticate, getAllDataPaper);
router.get("/box", authenticate, getAllDataBox);

export default router;
