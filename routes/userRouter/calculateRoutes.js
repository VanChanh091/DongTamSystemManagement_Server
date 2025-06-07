import { Router } from "express";
import authenticate from "../../middlewares/authMiddleware.js";
import {
  calculateDao,
  calculateDay,
  calculateDmSong,
  calculateTotalConsumption,
  calculateWeight,
} from "../../controller/user/planning/calculateController.js";

const router = Router();

router.post("/weight", authenticate, calculateWeight);
router.post("/totalConsumption", authenticate, calculateTotalConsumption);
router.post("/dmDay", authenticate, calculateDay);
router.post("/dmSong", authenticate, calculateDmSong);
router.post("/dao", authenticate, calculateDao);

export default router;
