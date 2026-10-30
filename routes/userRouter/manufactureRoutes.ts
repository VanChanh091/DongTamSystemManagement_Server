import { Router } from "express";
import authenticate from "../../middlewares/authMiddleware";
import {
  addReportBox,
  addReportPaper,
  getPlanningPaper,
  getPlanningBox,
  updateReportPaper,
  updateReportBox,
} from "../../controller/user/manufacture/manufactureController";
import { authorizeAccess } from "../../middlewares/permissionMiddleware";
import { AuthorizeAccessParams } from "../../interface/types";

const router = Router();

const authorizePaperAccess = ({
  departments = [],
  permissions = [],
  requireDept = true,
}: AuthorizeAccessParams = {}) =>
  authorizeAccess({
    departments: [...new Set(["Production", ...departments])],
    permissions: [
      ...new Set([
        "machine1350",
        "machine1800",
        "machine1900",
        "machine2Layer",
        "MachineRollPaper",
        ...permissions,
      ]),
    ],
    requireDept,
  });

const authorizeBoxAccess = ({
  departments = [],
  permissions = [],
  requireDept = true,
}: AuthorizeAccessParams = {}) =>
  authorizeAccess({
    departments: [...new Set(["Production", ...departments])],
    permissions: [...new Set(["step2Production", ...permissions])],
    requireDept,
  });

//=========================PAPER=========================
router.get("/paper", authenticate, getPlanningPaper);
router.post("/paper", authenticate, authorizePaperAccess(), addReportPaper);
router.put(
  "/paper",
  authenticate,
  authorizePaperAccess({ permissions: ["QC"], requireDept: false }),
  updateReportPaper,
);

//=========================BOX=========================
router.get("/box", authenticate, getPlanningBox);
router.post("/box", authenticate, authorizeBoxAccess(), addReportBox);
router.put(
  "/box",
  authenticate,
  authorizeBoxAccess({ permissions: ["QC"], requireDept: false }),
  updateReportBox,
);

export default router;
