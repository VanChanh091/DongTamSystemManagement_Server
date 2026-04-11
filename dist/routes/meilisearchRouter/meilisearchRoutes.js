"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = __importDefault(require("../../middlewares/authMiddleware"));
const syncMeili_1 = require("../../assest/configs/meilisearch/sync/syncMeili");
const appError_1 = require("../../utils/appError");
const router = (0, express_1.Router)();
const syncFunctions = {
    customers: syncMeili_1.syncCustomerToMeili,
    products: syncMeili_1.syncProductToMeili,
    orders: syncMeili_1.syncOrderToMeili,
    employees: syncMeili_1.syncEmployeeToMeili,
    papers: syncMeili_1.syncPlanningPaperToMeili,
    boxes: syncMeili_1.syncPlanningBoxToMeili,
    inbound: syncMeili_1.syncInboundToMeili,
    inventory: syncMeili_1.syncInventoryToMeili,
    outbounds: syncMeili_1.syncOutboundToMeili,
    reportPapers: syncMeili_1.syncReportPaperToMeili,
    reportBoxes: syncMeili_1.syncReportBoxToMeili,
    dashboard: syncMeili_1.syncDashboardToMeili,
};
router.get("/:entity", authMiddleware_1.default, async (req, res, next) => {
    try {
        const { entity } = req.params;
        const { isDeleteAll } = req.query;
        const isDelete = isDeleteAll === "true";
        const syncFn = syncFunctions[entity];
        if (!syncFn) {
            throw appError_1.AppError.BadRequest(`Thực thể '${entity}' không được hỗ trợ đồng bộ`, "INVALID_SYNC_ENTITY");
        }
        // Thực hiện gọi hàm sync tương ứng
        await syncFn(Boolean(isDelete));
        return res.status(200).json({ message: `Sync ${entity} to Meilisearch successfully` });
    }
    catch (error) {
        next(error);
    }
});
router.delete("/", authMiddleware_1.default, async (req, res, next) => {
    try {
        const { indexName } = req.query;
        await (0, syncMeili_1.resetMeiliIndex)(indexName);
        return res.status(200).json({ message: `Delete ${indexName} from Meilisearch successfully` });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=meilisearchRoutes.js.map