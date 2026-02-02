"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runInTransaction = void 0;
const connectDB_1 = require("../../assest/configs/connectDB");
const runInTransaction = async (fn) => {
    const t = await connectDB_1.sequelize.transaction();
    try {
        const result = await fn(t);
        await t.commit();
        return result;
    }
    catch (e) {
        await t.rollback();
        throw e;
    }
};
exports.runInTransaction = runInTransaction;
//# sourceMappingURL=transactionHelper.js.map