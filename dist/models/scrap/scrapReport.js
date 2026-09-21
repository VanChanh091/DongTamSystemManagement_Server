"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScrapReport = void 0;
exports.initScrapReportModel = initScrapReportModel;
const sequelize_1 = require("sequelize");
//định nghĩa kiểu OOP
class ScrapReport extends sequelize_1.Model {
}
exports.ScrapReport = ScrapReport;
function initScrapReportModel(sequelize) {
    ScrapReport.init({
        scrapId: { type: sequelize_1.DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        qtyForklift: { type: sequelize_1.DataTypes.DOUBLE }, //xe nâng
        qtyInventory: { type: sequelize_1.DataTypes.DOUBLE }, //lưu kho
        qtyCoreTube: { type: sequelize_1.DataTypes.DOUBLE }, //ống nòng
        qtyProduction: { type: sequelize_1.DataTypes.DOUBLE }, //sản xuất
        qtyOther: { type: sequelize_1.DataTypes.DOUBLE }, //khác
        totalQtyScrap: { type: sequelize_1.DataTypes.DOUBLE, allowNull: false }, //tổng số lượng phế liệu
        machine: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        shiftProduction: { type: sequelize_1.DataTypes.ENUM("Ca 1", "Ca 2", "Ca 3"), allowNull: false },
        reportedBy: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        reportedAt: {
            type: sequelize_1.DataTypes.DATE,
            allowNull: false,
            get() {
                const rawValue = this.getDataValue("reportedAt");
                if (!rawValue)
                    return null;
                return new Date(rawValue.getTime() - rawValue.getTimezoneOffset() * 60000).toISOString();
            },
        },
        dayCompleted: { type: sequelize_1.DataTypes.DATE, allowNull: false },
        rejectReason: { type: sequelize_1.DataTypes.STRING },
        status: {
            type: sequelize_1.DataTypes.ENUM("pending", "confirmed", "allocated", "rejected"),
            allowNull: false,
            defaultValue: "pending",
        },
    }, {
        sequelize,
        tableName: "scrap_reports",
        timestamps: true,
        indexes: [
            //get
            { fields: ["reportedAt"] },
            //composite index
            { fields: ["status", "scrapId"] },
            { fields: ["machine", "status"] },
        ],
    });
    return ScrapReport;
}
//# sourceMappingURL=scrapReport.js.map