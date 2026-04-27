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
} from "../../controller/user/order/orderController";
import authenticate from "../../middlewares/authMiddleware";
import { authorizeAnyPermission } from "../../middlewares/permissionMiddleware";
import upload from "../../utils/image/uploadImage";

const router = Router();

//===============================ORDERS=====================================
router.get("/accept", authenticate, authorizeAnyPermission(["sale"]), getOrderAcceptted);
router.get(
  "/pending-reject",
  authenticate,
  authorizeAnyPermission(["sale"]),
  getOrderPendingAndReject,
);
router.post(
  "/",
  authenticate,
  upload.single("orderImage"),
  authorizeAnyPermission(["sale"]),
  addOrder,
);
router.put(
  "/",
  authenticate,
  upload.single("orderImage"),
  authorizeAnyPermission(["sale"]),
  updateOrder,
);
router.delete("/", authenticate, authorizeAnyPermission(["sale"]), deleteOrder);

//===============================ORDER AUTOCOMPLETE=====================================

router.get("/order-id-raw", authenticate, authorizeAnyPermission(["sale"]), getOrderIdRaw);
router.get("/order-detail", authenticate, authorizeAnyPermission(["sale"]), getOrderDetail);

//===============================CLOUDINARY IMAGE=====================================
router.get(
  "/get-signature",
  authenticate,
  authorizeAnyPermission(["sale"]),
  getCloudinarySignature,
);

export default router;
