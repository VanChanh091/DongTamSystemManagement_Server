import { Router } from "express";
import authenticate from "../../middlewares/authMiddleware";
import {
  resetMeiliIndex,
  syncCustomerToMeili,
  syncDashboardToMeili,
  syncDeliveryRequestToMeili,
  syncEmployeeToMeili,
  syncInboundToMeili,
  syncInventoryToMeili,
  syncOrderToMeili,
  syncOutboundToMeili,
  syncPlanningBoxToMeili,
  syncPlanningPaperToMeili,
  syncProductToMeili,
  syncReportBoxToMeili,
  syncReportPaperToMeili,
  syncScrapReportToMeili,
} from "../../assets/configs/meilisearch/sync/syncMeili";
import { AppError } from "../../utils/appError";
import { syncOrDeleteAllDataToMeili } from "../../assets/configs/meilisearch/sync/syncAllMeili";

const router = Router();

const syncFunctions: Record<string, (isDeleteAll: boolean) => Promise<any>> = {
  customers: syncCustomerToMeili,
  products: syncProductToMeili,
  orders: syncOrderToMeili,
  employees: syncEmployeeToMeili,
  papers: syncPlanningPaperToMeili,
  boxes: syncPlanningBoxToMeili,
  scrapReports: syncScrapReportToMeili,
  inbound: syncInboundToMeili,
  inventory: syncInventoryToMeili,
  outbounds: syncOutboundToMeili,
  reportPapers: syncReportPaperToMeili,
  reportBoxes: syncReportBoxToMeili,
  deliveryRequest: syncDeliveryRequestToMeili,
  dashboard: syncDashboardToMeili,
};

router.get("/:entity", authenticate, async (req, res, next) => {
  try {
    const { entity } = req.params;
    const { isDeleteAll } = req.query;

    const isDelete = isDeleteAll === "true";

    const syncFn = syncFunctions[entity as string];
    if (!syncFn) {
      throw AppError.BadRequest(
        `Thực thể '${entity}' không được hỗ trợ đồng bộ`,
        "INVALID_SYNC_ENTITY",
      );
    }

    // Thực hiện gọi hàm sync tương ứng
    await syncFn(Boolean(isDelete));

    return res.status(200).json({ message: `Sync ${entity} to Meilisearch successfully` });
  } catch (error) {
    next(error);
  }
});

router.delete("/", authenticate, async (req, res, next) => {
  try {
    const { indexName } = req.query;
    await resetMeiliIndex(indexName as string);

    return res.status(200).json({ message: `Delete ${indexName} from Meilisearch successfully` });
  } catch (error) {
    next(error);
  }
});

router.delete("/all", authenticate, async (req, res, next) => {
  try {
    const { isDeleteAll } = req.query as { isDeleteAll: string };
    await syncOrDeleteAllDataToMeili(isDeleteAll);

    return res.status(200).json({ message: "Delete all data from Meilisearch successfully" });
  } catch (error) {
    next(error);
  }
});

export default router;
