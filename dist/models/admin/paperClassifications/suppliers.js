"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Suppliers = void 0;
exports.initSuppliersModel = initSuppliersModel;
const sequelize_1 = require("sequelize");
//định nghĩa kiểu OOP
class Suppliers extends sequelize_1.Model {
}
exports.Suppliers = Suppliers;
function initSuppliersModel(sequelize) {
    Suppliers.init({
        supplierId: { type: sequelize_1.DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        supplierName: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        supplierCode: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        transferCode: {
            type: sequelize_1.DataTypes.STRING,
            allowNull: false,
            comment: "Mã chuyển đổi của công ty",
        },
        grade: {
            type: sequelize_1.DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1,
            validate: { isIn: [[1, 2, 3, 4]] },
            comment: "1: Tốt, 2: Khá, 3: Trung bình, 4: Kém",
        },
        isActive: {
            type: sequelize_1.DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
            comment: "Kiểm tra còn sử dụng hàng của NCC này không",
        },
    }, {
        sequelize,
        tableName: "admin_suppliers",
        timestamps: true,
    });
    return Suppliers;
}
//# sourceMappingURL=suppliers.js.map