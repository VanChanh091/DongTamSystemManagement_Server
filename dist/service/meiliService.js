"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.meiliService = void 0;
const meilisearch_connect_1 = require("../assest/configs/connect/meilisearch.connect");
exports.meiliService = {
    syncMeiliData: (indexKey, data) => {
        try {
            const index = meilisearch_connect_1.meiliClient.index(indexKey);
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
            const index = meilisearch_connect_1.meiliClient.index(indexKey);
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