import { Router } from "express";
import authenticate from "../../middlewares/authMiddleware";
import {
  syncCustomerToMeili,
  syncDashboardToMeili,
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
} from "../../assest/configs/meilisearch/sync/syncMeili";
import { AppError } from "../../utils/appError";

const router = Router();

const syncFunctions: Record<string, () => Promise<any>> = {
  customers: syncCustomerToMeili,
  products: syncProductToMeili,
  orders: syncOrderToMeili,
  employees: syncEmployeeToMeili,
  papers: syncPlanningPaperToMeili,
  boxes: syncPlanningBoxToMeili,
  inbound: syncInboundToMeili,
  inventory: syncInventoryToMeili,
  outbounds: syncOutboundToMeili,
  reportPapers: syncReportPaperToMeili,
  reportBoxes: syncReportBoxToMeili,
  dashboard: syncDashboardToMeili,
};

router.get("/:entity", authenticate, async (req, res, next) => {
  try {
    const { entity } = req.params;

    const syncFn = syncFunctions[entity as string];
    if (!syncFn) {
      throw AppError.BadRequest(
        `Thực thể '${entity}' không được hỗ trợ đồng bộ`,
        "INVALID_SYNC_ENTITY",
      );
    }

    // Thực hiện gọi hàm sync tương ứng
    await syncFn();

    return res.status(200).json({ message: `Sync ${entity} to Meilisearch successfully` });
  } catch (error) {
    next(error);
  }
});

export default router;
