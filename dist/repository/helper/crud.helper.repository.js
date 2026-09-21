"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrudHelper = void 0;
exports.CrudHelper = {
    findAll({ model, options }) {
        return model.findAll({
            attributes: { exclude: ["createdAt", "updatedAt"] },
            ...options,
        });
    },
    findByPk({ model, id, options, }) {
        return model.findByPk(id, options);
    },
    findOne({ model, where, options, }) {
        return model.findOne({ where, ...options });
    },
    createData({ model, data, transaction, }) {
        return model.create(data, { transaction });
    },
    bulkCreate({ model, data, options, }) {
        return model.bulkCreate(data, options);
    },
    updateData({ model, data, options, }) {
        return model.update(data, options);
    },
    deleteData({ model, where, transaction, }) {
        return model.destroy({ where, transaction });
    },
};
//# sourceMappingURL=crud.helper.repository.js.map