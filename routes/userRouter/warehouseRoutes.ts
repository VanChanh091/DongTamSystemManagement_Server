import { Router } from "express";
import authenticate from "../../middlewares/authMiddleware";
import { getAllInboundHistory } from "../../controller/user/warehouse/inboundHistoryController";

const router = Router();

//==================Report Planning Paper=====================
router.get("/getAllInbound", authenticate, getAllInboundHistory);
// router.get("/reportPaper/filter", authenticate, getReportedPaperByField);

//==================EXPORT EXCEL=====================
// router.post("/exportExcelBox", authenticate, exportExcelReportBox);

export default router;
