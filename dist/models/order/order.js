"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Order = void 0;
exports.initOrderModel = initOrderModel;
const sequelize_1 = require("sequelize");
//định nghĩa kiểu OOP
class Order extends sequelize_1.Model {
}
exports.Order = Order;
function initOrderModel(sequelize) {
    Order.init({
        orderId: { type: sequelize_1.DataTypes.STRING(14), allowNull: false, primaryKey: true },
        dayReceiveOrder: { type: sequelize_1.DataTypes.DATE, allowNull: false },
        flute: { type: sequelize_1.DataTypes.STRING },
        QC_box: { type: sequelize_1.DataTypes.STRING },
        canLan: { type: sequelize_1.DataTypes.STRING },
        daoXa: { type: sequelize_1.DataTypes.STRING },
        day: { type: sequelize_1.DataTypes.STRING },
        matE: { type: sequelize_1.DataTypes.STRING },
        matB: { type: sequelize_1.DataTypes.STRING },
        matC: { type: sequelize_1.DataTypes.STRING },
        matE2: { type: sequelize_1.DataTypes.STRING },
        songE: { type: sequelize_1.DataTypes.STRING },
        songB: { type: sequelize_1.DataTypes.STRING },
        songC: { type: sequelize_1.DataTypes.STRING },
        songE2: { type: sequelize_1.DataTypes.STRING },
        lengthPaperCustomer: { type: sequelize_1.DataTypes.DOUBLE, allowNull: false },
        lengthPaperManufacture: { type: sequelize_1.DataTypes.DOUBLE, allowNull: false },
        paperSizeCustomer: { type: sequelize_1.DataTypes.DOUBLE, allowNull: false },
        paperSizeManufacture: { type: sequelize_1.DataTypes.DOUBLE, allowNull: false },
        quantityCustomer: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
        quantityManufacture: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
        numberChild: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
        acreage: { type: sequelize_1.DataTypes.DOUBLE, allowNull: false },
        dvt: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        price: { type: sequelize_1.DataTypes.DOUBLE, allowNull: false },
        pricePaper: { type: sequelize_1.DataTypes.DOUBLE, allowNull: false },
        discount: { type: sequelize_1.DataTypes.DOUBLE },
        profit: { type: sequelize_1.DataTypes.DOUBLE },
        dateRequestShipping: { type: sequelize_1.DataTypes.DATE, allowNull: false },
        totalPrice: { type: sequelize_1.DataTypes.DOUBLE, allowNull: false },
        vat: { type: sequelize_1.DataTypes.INTEGER },
        totalPriceVAT: { type: sequelize_1.DataTypes.DOUBLE, allowNull: false },
        instructSpecial: { type: sequelize_1.DataTypes.STRING },
        isBox: { type: sequelize_1.DataTypes.BOOLEAN, defaultValue: false, allowNull: false },
        status: {
            type: sequelize_1.DataTypes.ENUM("pending", "accept", "reject", "planning", "stop"),
            allowNull: false,
            defaultValue: "pending",
        },
        rejectReason: { type: sequelize_1.DataTypes.STRING },
        //FK
        customerId: { type: sequelize_1.DataTypes.STRING },
        productId: { type: sequelize_1.DataTypes.STRING },
        userId: { type: sequelize_1.DataTypes.INTEGER },
    }, { sequelize, tableName: "Orders", timestamps: true });
    return Order;
}
//# sourceMappingURL=order.js.map