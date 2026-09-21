"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupplierPaperCodes = void 0;
exports.initSupplierPaperCodesModel = initSupplierPaperCodesModel;
const sequelize_1 = require("sequelize");
//định nghĩa kiểu OOP
class SupplierPaperCodes extends sequelize_1.Model {
}
exports.SupplierPaperCodes = SupplierPaperCodes;
function initSupplierPaperCodesModel(sequelize) {
    SupplierPaperCodes.init({
        supplierPaperId: { type: sequelize_1.DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        layerType: {
            type: sequelize_1.DataTypes.ENUM("NONE", "LINER", "FLUTE"),
            allowNull: false,
            defaultValue: "NONE",
        },
        companyCode: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        //FK
        supplierId: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
        paperTypeId: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    }, {
        sequelize,
        tableName: "admin_supplier_paper_codes",
        timestamps: true,
        indexes: [{ fields: ["supplierId"] }, { fields: ["paperTypeId"] }],
    });
    return SupplierPaperCodes;
}
//# sourceMappingURL=supplierPaperCodes.js.map