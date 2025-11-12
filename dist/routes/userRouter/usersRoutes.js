"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = __importDefault(require("../../middlewares/authMiddleware"));
const userController_1 = require("../../controller/user/users/userController");
const uploadImage_1 = __importDefault(require("../../utils/image/uploadImage"));
const router = (0, express_1.Router)();
router.put("/updateUser", authMiddleware_1.default, uploadImage_1.default.single("avatar"), userController_1.updateProfileUser);
exports.default = router;
//# sourceMappingURL=usersRoutes.js.map