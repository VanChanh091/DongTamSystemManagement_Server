"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DebtDeductionRequest = void 0;
exports.initdebtDeductionRequestModel = initdebtDeductionRequestModel;
const sequelize_1 = require("sequelize");
//định nghĩa kiểu OOP
class DebtDeductionRequest extends sequelize_1.Model {
}
exports.DebtDeductionRequest = DebtDeductionRequest;
function initdebtDeductionRequestModel(sequelize) {
    DebtDeductionRequest.init({
        requestId: { type: sequelize_1.DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        amountRequested: { type: sequelize_1.DataTypes.DOUBLE, allowNull: false },
        paymentMethod: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        status: {
            type: sequelize_1.DataTypes.ENUM("pending", "approved", "rejected"),
            allowNull: false,
            defaultValue: "pending",
        },
        requestedBy: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        approvedBy: { type: sequelize_1.DataTypes.STRING, allowNull: true },
        rejectReason: { type: sequelize_1.DataTypes.STRING },
        isUrgent: {
            type: sequelize_1.DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: "đánh dấu yêu cầu khẩn cấp duyệt qua OTP",
        },
        //FK
        customerId: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        userId: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    }, {
        sequelize,
        tableName: "debt_deduction_request",
        timestamps: true,
        indexes: [
            //FK
            { fields: ["customerId"] },
            { fields: ["userId"] },
            //index
            { fields: ["status"] },
        ],
    });
    return DebtDeductionRequest;
}
//# sourceMappingURL=debtDeductionRequest.js.map