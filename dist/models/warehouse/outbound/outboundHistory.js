"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutboundHistory = void 0;
exports.initOutboundHistoryModel = initOutboundHistoryModel;
const sequelize_1 = require("sequelize");
//định nghĩa kiểu OOP
class OutboundHistory extends sequelize_1.Model {
}
exports.OutboundHistory = OutboundHistory;
function initOutboundHistoryModel(sequelize) {
    OutboundHistory.init({
        outboundId: { type: sequelize_1.DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        dateOutbound: {
            type: sequelize_1.DataTypes.DATE,
            allowNull: false,
            get() {
                const rawValue = this.getDataValue("dateOutbound");
                if (!rawValue)
                    return null;
                return new Date(rawValue.getTime() - rawValue.getTimezoneOffset() * 60000).toISOString();
            },
        },
        outboundSlipCode: { type: sequelize_1.DataTypes.STRING, allowNull: false, unique: true },
        totalPriceOrder: { type: sequelize_1.DataTypes.DOUBLE, allowNull: false },
        totalPriceVAT: { type: sequelize_1.DataTypes.DOUBLE },
        totalPricePayment: { type: sequelize_1.DataTypes.DOUBLE, allowNull: false },
        totalOutboundQty: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
        dueDate: { type: sequelize_1.DataTypes.DATE, comment: "Thời hạn thanh toán PXK" },
        paidAmount: { type: sequelize_1.DataTypes.DOUBLE, comment: "Số tiền đã thanh toán" },
        remainingAmount: { type: sequelize_1.DataTypes.DOUBLE, comment: "Số tiền còn lại phải thanh toán" },
        outboundBy: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        updatedBy: { type: sequelize_1.DataTypes.STRING },
        status: {
            type: sequelize_1.DataTypes.ENUM("paid", "unpaid", "partial"),
            defaultValue: "unpaid",
            allowNull: false,
        },
        writeOffAmount: { type: sequelize_1.DataTypes.DOUBLE, comment: "Số tiền đã xóa nợ" },
        //FK
        customerId: { type: sequelize_1.DataTypes.STRING, allowNull: false },
    }, {
        sequelize,
        tableName: "outbound_histories",
        timestamps: true,
        indexes: [
            //indexes
            { fields: ["dateOutbound"] },
            { fields: ["outboundSlipCode"] },
            //composite indexes
            { name: "idx_outbound_summary", fields: ["customerId", "status", "outboundSlipCode"] },
            //index phục vụ cho việc tìm các KH chưa chốt công nợ
            {
                name: "idx_outbound_unpaid_summary",
                fields: ["customerId", "dueDate", "status", "dateOutbound", "remainingAmount"],
            },
            //index phục vụ cho việc tìm các PXK chưa thanh toán
            {
                // case: Theo ngày xuất kho
                name: "idx_outbound_debt_by_date",
                fields: ["status", "remainingAmount", "dateOutbound"],
            },
            {
                // case: Theo mã khách hàng
                name: "idx_outbound_debt_by_customer",
                fields: ["status", "customerId", "remainingAmount"],
            },
            //index phục vụ cho việc gom nhóm báo cáo doanh thu theo năm
            {
                name: "idx_outbound_summary_by_year",
                fields: ["dateOutbound", "customerId", "totalPricePayment"],
            },
        ],
    });
    return OutboundHistory;
}
//# sourceMappingURL=outboundHistory.js.map