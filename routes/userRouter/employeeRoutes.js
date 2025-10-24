import Router from "express";

import authenticate from "../../middlewares/authMiddleware.js";
import { authorizeAnyPermission } from "../../middlewares/permissionMiddleware.js";

const router = Router();

// router.get("/", authenticate, getAllCustomer);
// router.get("/filter", authenticate, getCustomerByField);

// router.post("/exportExcel", authenticate, exportExcelCustomer);
// router.post("/", authenticate, authorizeAnyPermission(["sale"]), createCustomer);
// router.put("/customerUp", authenticate, authorizeAnyPermission(["sale"]), updateCustomer);
// router.delete("/customerDel", authenticate, authorizeAnyPermission(["sale"]), deleteCustomer);

export default router;
