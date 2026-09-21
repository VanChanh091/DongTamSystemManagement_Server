"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DailyReportPerformance = void 0;
exports.initDailyReportModel = initDailyReportModel;
const sequelize_1 = require("sequelize");
//định nghĩa kiểu OOP
class DailyReportPerformance extends sequelize_1.Model {
}
exports.DailyReportPerformance = DailyReportPerformance;
function initDailyReportModel(sequelize) {
    DailyReportPerformance.init({
        dailyReportId: { type: sequelize_1.DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        dayReport: {
            type: sequelize_1.DataTypes.DATEONLY,
            allowNull: false,
            // get() {
            //   const rawValue = this.getDataValue("dayReport");
            //   if (!rawValue) return null;
            //   return new Date(rawValue.getTime() - rawValue.getTimezoneOffset() * 60000).toISOString();
            // },
        },
        machine: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        flute: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
        totalLength: { type: sequelize_1.DataTypes.DOUBLE, allowNull: false },
        totalDurations: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    }, {
        sequelize,
        tableName: "report_performances",
        timestamps: true,
        indexes: [
            //indexes
            { fields: ["dayReport", "machine", "flute"] },
        ],
    });
    return DailyReportPerformance;
}
//# sourceMappingURL=dailyReportPerformance.js.map