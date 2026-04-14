"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runInTransaction = void 0;
const database_connect_1 = require("../../assets/configs/connect/database.connect");
const runInTransaction = async (fn) => {
    const t = await database_connect_1.sequelize.transaction();
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