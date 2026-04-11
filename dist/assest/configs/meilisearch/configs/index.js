"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupMeilisearch = void 0;
const meilisearch_connect_1 = require("../../connect/meilisearch.connect");
const meilisearch_config_1 = require("./meilisearch.config");
const setupMeilisearch = async () => {
    await Promise.all([
        meilisearch_connect_1.meiliClient.index("customers").updateSettings(meilisearch_config_1.customersSettings),
        meilisearch_connect_1.meiliClient.index("products").updateSettings(meilisearch_config_1.productsSettings),
        meilisearch_connect_1.meiliClient.index("orders").updateSettings(meilisearch_config_1.ordersSettings),
        meilisearch_connect_1.meiliClient.index("employees").updateSettings(meilisearch_config_1.employeesSettings),
        meilisearch_connect_1.meiliClient.index("planningPapers").updateSettings(meilisearch_config_1.planningPaperSettings),
        meilisearch_connect_1.meiliClient.index("planningBoxes").updateSettings(meilisearch_config_1.planningBoxSettings),
        meilisearch_connect_1.meiliClient.index("inboundHistories").updateSettings(meilisearch_config_1.inboundSettings),
        meilisearch_connect_1.meiliClient.index("outbounds").updateSettings(meilisearch_config_1.outboundSettings),
        meilisearch_connect_1.meiliClient.index("inventories").updateSettings(meilisearch_config_1.inventorySettings),
        meilisearch_connect_1.meiliClient.index("reportPapers").updateSettings(meilisearch_config_1.reportPaperSettings),
        meilisearch_connect_1.meiliClient.index("reportBoxes").updateSettings(meilisearch_config_1.reportBoxSettings),
        meilisearch_connect_1.meiliClient.index("dashboard").updateSettings(meilisearch_config_1.dashboardSettings),
    ]);
};
exports.setupMeilisearch = setupMeilisearch;
//# sourceMappingURL=index.js.map