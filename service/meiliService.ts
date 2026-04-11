import { meiliClient } from "../assets/configs/connect/meilisearch.connect";

export const meiliService = {
  syncMeiliData: (indexKey: string, data: any | any[]) => {
    try {
      const index = meiliClient.index(indexKey);
      const documents = Array.isArray(data) ? data : [data];

      // Đẩy lên Meilisearch
      index.addDocuments(documents).catch((err) => {
        console.error(`[Meili] Async Add Error for ${indexKey}:`, err);
      });
    } catch (error) {
      console.error(`[Meili] Sync error for ${indexKey}:`, error);
    }
  },

  deleteMeiliData: (indexKey: string, id: number | string) => {
    try {
      const index = meiliClient.index(indexKey);

      index.deleteDocument(id).catch((err) => {
        console.error(`[Meili] Async Delete Error for ${indexKey}:`, err);
      });
    } catch (error) {
      console.error(`[Meili] Delete error for ${indexKey}:`, error);
    }
  },
};
