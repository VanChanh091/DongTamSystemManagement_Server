import Router from "express";
import authenticate from "../../middlewares/authMiddleware";
import { authorizeRole } from "../../middlewares/permissionMiddleware";
import { cleanAllForeignKeysDb } from "../../controller/system/systemController";
import {
  clearCacheController,
  getCacheStatsController,
} from "../../controller/system/cacheController";

const router = Router();

//clear foreign key
router.post("/clear-fk", authenticate, authorizeRole(["admin"]), cleanAllForeignKeysDb);

//redis cache management
router.get("/redis/stats", authenticate, authorizeRole(["admin"]), getCacheStatsController);
router.post("/redis/clear-cache", authenticate, authorizeRole(["admin"]), clearCacheController);

export default router;
