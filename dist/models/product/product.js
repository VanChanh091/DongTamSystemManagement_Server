"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Product = void 0;
exports.initProductModel = initProductModel;
const sequelize_1 = require("sequelize");
//định nghĩa kiểu OOP
class Product extends sequelize_1.Model {
}
exports.Product = Product;
function initProductModel(sequelize) {
    Product.init({
        productId: {
            type: sequelize_1.DataTypes.STRING(14),
            allowNull: false,
            primaryKey: true,
        },
        typeProduct: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        productName: { type: sequelize_1.DataTypes.STRING },
        maKhuon: { type: sequelize_1.DataTypes.STRING },
        productImage: { type: sequelize_1.DataTypes.STRING },
        productSeq: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    }, {
        sequelize,
        tableName: "Products",
        timestamps: true,
        indexes: [{ fields: ["productSeq"] }],
    });
    return Product;
}
//# sourceMappingURL=product.js.map