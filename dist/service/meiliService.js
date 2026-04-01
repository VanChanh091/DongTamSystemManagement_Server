"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.meiliService = exports.MEILI_INDEX = void 0;
const melisearch_config_1 = require("../assest/configs/connect/melisearch.config");
exports.MEILI_INDEX = {
    CUSTOMERS: "customers",
    PRODUCTS: "products",
    ORDERS: "orders",
    EMPLOYEES: "employees",
    PLANNING_PAPERS: "planningPapers",
    PLANNING_BOXES: "planningBoxes",
    OUTBOUNDS: "outbounds",
    INVENTORIES: "inventories",
    REPORT_PAPERS: "reportPapers",
    REPORT_BOXES: "reportBoxes",
    INBOUND: "inboundHistories",
    DASHBOARD: "dashboard",
};
exports.meiliService = {
    syncMeiliData: (indexKey, data) => {
        try {
            const index = melisearch_config_1.meiliClient.index(indexKey);
            const documents = Array.isArray(data) ? data : [data];
            // Đẩy lên Meilisearch
            index.addDocuments(documents).catch((err) => {
                console.error(`[Meili] Async Add Error for ${indexKey}:`, err);
            });
        }
        catch (error) {
            console.error(`[Meili] Sync error for ${indexKey}:`, error);
        }
    },
    deleteMeiliData: (indexKey, id) => {
        try {
            const index = melisearch_config_1.meiliClient.index(indexKey);
            index.deleteDocument(id).catch((err) => {
                console.error(`[Meili] Async Delete Error for ${indexKey}:`, err);
            });
        }
        catch (error) {
            console.error(`[Meili] Delete error for ${indexKey}:`, error);
        }
    },
};
//# sourceMappingURL=meiliService.js.map