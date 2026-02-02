"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfileUser = void 0;
const userService_1 = require("../../../service/userService");
const updateProfileUser = async (req, res, next) => {
    const { userId } = req.query;
    const { newPassword, userUpdated } = req.body;
    try {
        const response = await userService_1.userService.updateProfile({
            req,
            userId: Number(userId),
            newPassword,
            userUpdated,
        });
        return res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateProfileUser = updateProfileUser;
//# sourceMappingURL=userController.js.map