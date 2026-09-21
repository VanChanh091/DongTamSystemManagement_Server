"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanAllForeignKeysDb = void 0;
const clearFkService_1 = require("../../service/system/clearFkService");
const cleanAllForeignKeysDb = async (req, res, next) => {
    try {
        const response = await (0, clearFkService_1.cleanAllForeignKeys)();
        return res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.cleanAllForeignKeysDb = cleanAllForeignKeysDb;
//# sourceMappingURL=systemController.js.map