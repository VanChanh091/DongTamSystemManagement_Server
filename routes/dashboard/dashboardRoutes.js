import { Router } from "express";
import { getAllDataPaper } from "../../controller/dashboard/getAllData.js";
import authenticate from "../../middlewares/authMiddleware.js";

const router = Router();

router.get("/paper", authenticate, getAllDataPaper);

export default router;
