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
    const priorityMap = {
        pending: 1,
        accept: 2,
        reject: 3,
        planning: 4,
        stop: 5,
    };
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
        volume: { type: sequelize_1.DataTypes.DOUBLE, allowNull: false },
        instructSpecial: { type: sequelize_1.DataTypes.STRING },
        isBox: { type: sequelize_1.DataTypes.BOOLEAN, defaultValue: false, allowNull: false },
        status: {
            type: sequelize_1.DataTypes.ENUM("pending", "accept", "reject", "planning", "stop"), //1-2-3-4-5
            allowNull: false,
            defaultValue: "pending",
        },
        rejectReason: { type: sequelize_1.DataTypes.STRING },
        //sort
        orderSortValue: { type: sequelize_1.DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
        statusPriority: { type: sequelize_1.DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
        //FK
        customerId: { type: sequelize_1.DataTypes.STRING },
        productId: { type: sequelize_1.DataTypes.STRING },
        userId: { type: sequelize_1.DataTypes.INTEGER },
    }, {
        sequelize,
        tableName: "Orders",
        timestamps: true,
        hooks: {
            beforeSave: (order) => {
                if (order.changed("status")) {
                    order.statusPriority = priorityMap[order.status] || 1;
                }
                if (order.changed("orderId") && order.orderId) {
                    const parts = order.orderId.split("/"); // Ví dụ: [123, 11, 25, D002]
                    if (parts.length >= 4) {
                        const po = parseInt(parts[0], 10) || 0;
                        const month = parseInt(parts[1], 10) || 0;
                        const year = parseInt(parts[2], 10) || 0;
                        // Tách số từ hậu tố "D002" -> 002
                        const suffix = parseInt(parts[3].replace(/\D/g, ""), 10) || 0;
                        // Công thức: Value = (Year * 10^9) + (Month * 10^7) + (PO * 10^3) + Suffix
                        order.orderSortValue = year * 1000000000 + month * 10000000 + po * 1000 + suffix;
                    }
                }
            },
        },
        indexes: [
            //FK
            { fields: ["customerId"] },
            { fields: ["productId"] },
            { fields: ["userId"] },
            //search
            { fields: ["QC_box"] },
            { fields: ["price"] },
            //other field
            { fields: ["status"] },
            { fields: ["createdAt"] },
            { fields: ["orderSortValue"] },
            //sort
            { fields: ["statusPriority", "orderSortValue"] },
        ],
    });
    return Order;
}
//# sourceMappingURL=order.js.map