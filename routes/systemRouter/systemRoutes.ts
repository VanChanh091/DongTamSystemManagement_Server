import Router from "express";
import authenticate from "../../middlewares/authMiddleware";
import { authorizeAccess } from "../../middlewares/permissionMiddleware";
import { cleanAllForeignKeysDb } from "../../controller/system/systemController";
import {
  clearCacheController,
  getCacheStatsController,
} from "../../controller/system/cacheController";

const router = Router();

const authorizeAdmin = () => authorizeAccess({});

//clear foreign key
router.post("/clear-fk", authenticate, authorizeAdmin(), cleanAllForeignKeysDb);

//redis cache management
router.get("/redis/stats", authenticate, authorizeAdmin(), getCacheStatsController);
router.post("/redis/clear-cache", authenticate, authorizeAdmin(), clearCacheController);

export default router;
