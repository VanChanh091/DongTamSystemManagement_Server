"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = __importDefault(require("../../middlewares/authMiddleware"));
const productController_1 = require("../../controller/user/product/productController");
const uploadImage_1 = __importDefault(require("../../utils/image/uploadImage"));
const permissionMiddleware_1 = require("../../middlewares/permissionMiddleware");
const router = (0, express_1.Router)();
router.get("/", authMiddleware_1.default, productController_1.getProducts);
router.post("/export", authMiddleware_1.default, productController_1.exportExcelProduct);
router.post("/", authMiddleware_1.default, uploadImage_1.default.single("productImage"), (0, permissionMiddleware_1.authorizeAnyPermission)(["sale"]), productController_1.addProduct);
router.put("/", authMiddleware_1.default, uploadImage_1.default.single("productImage"), (0, permissionMiddleware_1.authorizeAnyPermission)(["sale"]), productController_1.updateProduct);
router.delete("/", authMiddleware_1.default, (0, permissionMiddleware_1.authorizeAnyPermission)(["sale"]), productController_1.deleteProduct);
exports.default = router;
//# sourceMappingURL=productRoutes.js.map