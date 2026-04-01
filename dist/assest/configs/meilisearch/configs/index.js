"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupMeilisearch = void 0;
const melisearch_config_1 = require("../../connect/melisearch.config");
const meilisearch_config_1 = require("./meilisearch.config");
const setupMeilisearch = async () => {
    await Promise.all([
        melisearch_config_1.meiliClient.index("customers").updateSettings(meilisearch_config_1.customersSettings),
        melisearch_config_1.meiliClient.index("products").updateSettings(meilisearch_config_1.productsSettings),
        melisearch_config_1.meiliClient.index("employees").updateSettings(meilisearch_config_1.employeesSettings),
        melisearch_config_1.meiliClient.index("orders").updateSettings(meilisearch_config_1.ordersSettings),
        melisearch_config_1.meiliClient.index("planningPapers").updateSettings(meilisearch_config_1.planningPaperSettings),
        melisearch_config_1.meiliClient.index("planningBoxes").updateSettings(meilisearch_config_1.planningBoxSettings),
        melisearch_config_1.meiliClient.index("outbounds").updateSettings(meilisearch_config_1.outboundSettings),
        melisearch_config_1.meiliClient.index("inventories").updateSettings(meilisearch_config_1.inventorySettings),
        melisearch_config_1.meiliClient.index("inboundHistories").updateSettings(meilisearch_config_1.inboundSettings),
        melisearch_config_1.meiliClient.index("reportPapers").updateSettings(meilisearch_config_1.reportPaperSettings),
        melisearch_config_1.meiliClient.index("reportBoxes").updateSettings(meilisearch_config_1.reportBoxSettings),
        melisearch_config_1.meiliClient.index("dashboard").updateSettings(meilisearch_config_1.dashboardSettings),
    ]);
};
exports.setupMeilisearch = setupMeilisearch;
//# sourceMappingURL=index.js.map