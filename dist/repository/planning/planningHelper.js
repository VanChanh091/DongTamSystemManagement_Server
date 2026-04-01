"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.planningHelper = void 0;
exports.planningHelper = {
    //====================================FUNC GLOBAL========================================
    getModelById: async ({ model, where, options = {} }) => {
        return await model.findOne({ where, ...options });
    },
    updateDataModel: async ({ model, data, options = {} }) => {
        return await model.update(data, options);
    },
    deleteModelData: async ({ model, where, transaction }) => {
        return await model.destroy({ where, transaction });
    },
    createData: async ({ model, data, transaction }) => {
        return await model.create(data, { transaction });
    },
};
//# sourceMappingURL=planningHelper.js.map