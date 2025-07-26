import { Router } from "express";
import authenticate from "../../middlewares/authMiddleware.js";
import {
  addReportPaper,
  getPlanningBox,
  getPlanningPaper,
} from "../../controller/user/manufacture/manufactureController.js";
import { authorizeAnyPermission } from "../../middlewares/permissionMiddleware.js";

const router = Router();

router.get("/planningPaper", authenticate, getPlanningPaper);
router.get(
  "/planningBox",
  authenticate,
  authorizeAnyPermission(["production"]),
  getPlanningBox
);
router.post(
  "/reportPaper",
  authenticate,
  authorizeAnyPermission(["production"]),
  addReportPaper
);

export default router;
