"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportPlanningPaper = void 0;
exports.initReportPlanningPaperModel = initReportPlanningPaperModel;
const sequelize_1 = require("sequelize");
//định nghĩa kiểu OOP
class ReportPlanningPaper extends sequelize_1.Model {
}
exports.ReportPlanningPaper = ReportPlanningPaper;
function initReportPlanningPaperModel(sequelize) {
    ReportPlanningPaper.init({
        reportPaperId: { type: sequelize_1.DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        dayReport: {
            type: sequelize_1.DataTypes.DATE,
            allowNull: false,
            get() {
                const rawValue = this.getDataValue("dayReport");
                if (!rawValue)
                    return null;
                return new Date(rawValue.getTime() - rawValue.getTimezoneOffset() * 60000).toISOString();
            },
        },
        qtyProduced: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
        lackOfQty: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
        totalPrice: { type: sequelize_1.DataTypes.DOUBLE, allowNull: false, defaultValue: 0 },
        qtyWasteNorm: { type: sequelize_1.DataTypes.DOUBLE, allowNull: false, defaultValue: 0 },
        shiftProduction: { type: sequelize_1.DataTypes.ENUM("Ca 1", "Ca 2", "Ca 3"), allowNull: false },
        shiftManagement: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        reportedBy: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        totalLength: { type: sequelize_1.DataTypes.DOUBLE, allowNull: false, defaultValue: 0 },
        durations: { type: sequelize_1.DataTypes.DOUBLE, allowNull: false, defaultValue: 0 },
        averageSpeed: { type: sequelize_1.DataTypes.DOUBLE, allowNull: false, defaultValue: 0 },
        //FK
        planningId: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    }, {
        sequelize,
        tableName: "report_planning_papers",
        timestamps: true,
        indexes: [
            //FK
            { fields: ["planningId"] },
            //indexes
            { fields: ["dayReport"] },
        ],
    });
    return ReportPlanningPaper;
}
//# sourceMappingURL=reportPlanningPaper.js.map