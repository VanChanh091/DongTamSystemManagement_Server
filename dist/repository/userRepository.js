"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRepository = void 0;
const user_1 = require("../models/user/user");
exports.userRepository = {
    findUserById: async (userId) => {
        return await user_1.User.findByPk(userId);
    },
};
//# sourceMappingURL=userRepository.js.map