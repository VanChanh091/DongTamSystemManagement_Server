"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const uploadImage_1 = __importDefault(require("../../utils/image/uploadImage"));
const authMiddleware_1 = __importDefault(require("../../middlewares/authMiddleware"));
const processingDataController_1 = require("../../controller/processingData/processingDataController");
const router = (0, express_1.default)();
router.post("/order", authMiddleware_1.default, uploadImage_1.default.single("order"), processingDataController_1.bulkImportOrdersController);
router.post("/customer", authMiddleware_1.default, uploadImage_1.default.single("customer"), processingDataController_1.bulkImportCustomers);
router.post("/product", authMiddleware_1.default, uploadImage_1.default.single("product"), processingDataController_1.bulkImportProducts);
exports.default = router;
//# sourceMappingURL=processingRoutes.js.map