"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderApproved = void 0;
exports.initOrderApprovedModel = initOrderApprovedModel;
const sequelize_1 = require("sequelize");
//định nghĩa kiểu OOP
class OrderApproved extends sequelize_1.Model {
}
exports.OrderApproved = OrderApproved;
function initOrderApprovedModel(sequelize) {
    OrderApproved.init({
        approverId: { type: sequelize_1.DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        approvedBy: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        action: {
            type: sequelize_1.DataTypes.ENUM("APPROVED", "RETURNED"),
            allowNull: false,
            defaultValue: "APPROVED",
        },
        //FK
        orderId: { type: sequelize_1.DataTypes.STRING, allowNull: false },
    }, {
        sequelize,
        tableName: "order_approved",
        timestamps: true,
        indexes: [
            //get
            { fields: ["approvedBy"] },
        ],
    });
    return OrderApproved;
}
//# sourceMappingURL=orderApproved.js.map