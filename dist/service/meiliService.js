"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.meiliService = void 0;
const meilisearch_connect_1 = require("../assets/configs/connect/meilisearch.connect");
exports.meiliService = {
    syncOrUpdateMeiliData: async ({ indexKey, data, transaction, isUpdate = false, }) => {
        const performSyncOrUpdate = async () => {
            try {
                const index = meilisearch_connect_1.meiliClient.index(indexKey);
                const documents = Array.isArray(data) ? data : [data];
                // Đẩy lên Meilisearch
                if (isUpdate) {
                    return await index.updateDocuments(documents);
                }
                return await index.addDocuments(documents);
            }
            catch (error) {
                console.error(`[Meili] Sync error for ${indexKey}:`, error);
                throw error;
            }
        };
        // Nếu có transaction, đăng ký thực hiện sau khi DB commit thành công
        if (transaction) {
            transaction.afterCommit(async () => {
                await performSyncOrUpdate();
            });
            return;
        }
        return await performSyncOrUpdate();
    },
    deleteMeiliData: async (indexKey, id, transaction) => {
        const performDelete = async () => {
            try {
                const index = meilisearch_connect_1.meiliClient.index(indexKey);
                return await index.deleteDocument(id);
            }
            catch (error) {
                console.error(`[Meili] Delete error for ${indexKey}:`, error);
                throw error;
            }
        };
        // Nếu có transaction, đăng ký thực hiện sau khi DB commit thành công
        if (transaction) {
            transaction.afterCommit(async () => {
                await performDelete();
            });
            return;
        }
        return await performDelete();
    },
};
//# sourceMappingURL=meiliService.js.map