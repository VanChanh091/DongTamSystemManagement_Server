"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderImage = void 0;
exports.initOrderImageModel = initOrderImageModel;
const sequelize_1 = require("sequelize");
class OrderImage extends sequelize_1.Model {
}
exports.OrderImage = OrderImage;
function initOrderImageModel(sequelize) {
    OrderImage.init({
        imageId: {
            type: sequelize_1.DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        imageUrl: {
            type: sequelize_1.DataTypes.STRING,
            allowNull: false,
        },
        publicId: {
            type: sequelize_1.DataTypes.STRING,
            allowNull: false,
        },
        //FK
        orderId: { type: sequelize_1.DataTypes.STRING, allowNull: false },
    }, {
        sequelize,
        tableName: "OrderImages",
        timestamps: true,
        indexes: [{ fields: ["orderId"] }],
    });
    return OrderImage;
}
//# sourceMappingURL=orderImage.js.map