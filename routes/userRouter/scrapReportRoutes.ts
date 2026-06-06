import { Router } from "express";
import authenticate from "../../middlewares/authMiddleware";
import {
  createScrapReport,
  exportExcelScrapReports,
  getAllScrapReports,
  updateScrapReport,
} from "../../controller/user/scrap/scrapReportController";

const router = Router();

router.get("/", authenticate, getAllScrapReports);
router.post("/", authenticate, createScrapReport);
router.put("/", authenticate, updateScrapReport);
router.post("/export", authenticate, exportExcelScrapReports);

export default router;
