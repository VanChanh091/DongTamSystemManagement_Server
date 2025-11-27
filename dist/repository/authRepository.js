"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRepository = void 0;
const user_1 = require("../models/user/user");
exports.authRepository = {
    findUserByEmail: async (email) => {
        return await user_1.User.findOne({ where: { email } });
    },
    createUser: async (data) => {
        return await user_1.User.create(data);
    },
    updatePassword: async (email, hashedPassword) => {
        return await user_1.User.update({ password: hashedPassword }, { where: { email } });
    },
};
//# sourceMappingURL=authRepository.js.map