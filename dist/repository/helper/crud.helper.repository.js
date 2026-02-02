"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrudHelper = void 0;
exports.CrudHelper = {
    findByPk({ model, id, options = {}, }) {
        return model.findByPk(id, options);
    },
    findOne({ model, whereCondition, options = {}, }) {
        return model.findOne({
            where: whereCondition,
            ...options,
        });
    },
    findAll({ model, whereCondition, options = {}, }) {
        return model.findAll({
            where: whereCondition,
            ...options,
        });
    },
    create({ model, data, transaction, }) {
        return model.create(data, { transaction });
    },
    bulkCreate({ model, data, options = {}, }) {
        return model.bulkCreate(data, options);
    },
    updateByIds({ model, whereCondition, data, transaction, }) {
        return model.update(data, {
            where: whereCondition,
            transaction,
        });
    },
    deleteByIds({ model, whereCondition, transaction, }) {
        return model.destroy({
            where: whereCondition,
            transaction,
        });
    },
};
//# sourceMappingURL=crud.helper.repository.js.map