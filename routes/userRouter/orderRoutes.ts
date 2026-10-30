import Router from "express";
import {
  addOrder,
  deleteOrder,
  updateOrder,
  getOrderPendingAndReject,
  getOrderDetail,
  getOrderIdRaw,
  getOrderAcceptted,
  getCloudinarySignature,
  getPaperCodeForStructure,
} from "../../controller/user/order/orderController";
import upload from "../../utils/image/uploadImage";
import authenticate from "../../middlewares/authMiddleware";
import { AuthorizeAccessParams } from "../../interface/types";
import { authorizeAccess } from "../../middlewares/permissionMiddleware";

const router = Router();

export const authorizeSaleAccess = ({
  departments = [],
  permissions = [],
  requireDept = true,
}: AuthorizeAccessParams = {}) =>
  authorizeAccess({
    departments: [...new Set(["Sale", ...departments])],
    permissions: [...new Set(["sale", ...permissions])],
    requireDept,
  });

//===============================ORDERS=====================================
router.get("/accept", authenticate, authorizeSaleAccess(), getOrderAcceptted);
router.get("/pending-reject", authenticate, authorizeSaleAccess(), getOrderPendingAndReject);
router.post("/", authenticate, upload.single("orderImage"), authorizeSaleAccess(), addOrder);
router.put("/", authenticate, upload.single("orderImage"), authorizeSaleAccess(), updateOrder);
router.delete("/", authenticate, authorizeSaleAccess(), deleteOrder);

//===============================ORDER AUTOCOMPLETE=====================================

router.get(
  "/order-id-raw",
  authenticate,
  authorizeSaleAccess({ permissions: ["plan"], requireDept: false }),
  getOrderIdRaw,
);
router.get("/order-detail", authenticate, authorizeSaleAccess(), getOrderDetail);

//============================PAPER CODE FOR STRUCTURE=================================
router.get("/paper-code", authenticate, authorizeSaleAccess(), getPaperCodeForStructure);

//===============================CLOUDINARY IMAGE=====================================
router.get(
  "/get-signature",
  authenticate,
  authorizeSaleAccess({ permissions: ["QC"], requireDept: false }),
  getCloudinarySignature,
);

export default router;
