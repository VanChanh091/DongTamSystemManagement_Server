import { Transaction } from "sequelize";
import { meiliClient } from "../assets/configs/connect/meilisearch.connect";

export const meiliService = {
  syncOrUpdateMeiliData: async ({
    indexKey,
    data,
    transaction,
    isUpdate = false,
  }: {
    indexKey: string;
    data: any | any[];
    transaction: Transaction;
    isUpdate?: boolean;
  }) => {
    const performSyncOrUpdate = async () => {
      try {
        const index = meiliClient.index(indexKey);
        const documents = Array.isArray(data) ? data : [data];

        // Đẩy lên Meilisearch
        if (isUpdate) {
          return await index.updateDocuments(documents);
        }

        return await index.addDocuments(documents);
      } catch (error) {
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

  deleteMeiliData: async (indexKey: string, id: number | string, transaction?: Transaction) => {
    const performDelete = async () => {
      try {
        const index = meiliClient.index(indexKey);
        return await index.deleteDocument(id);
      } catch (error) {
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
