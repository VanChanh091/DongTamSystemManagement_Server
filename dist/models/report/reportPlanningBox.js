"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportPlanningBox = void 0;
exports.initReportPlanningBoxModel = initReportPlanningBoxModel;
const sequelize_1 = require("sequelize");
//định nghĩa kiểu OOP
class ReportPlanningBox extends sequelize_1.Model {
}
exports.ReportPlanningBox = ReportPlanningBox;
function initReportPlanningBoxModel(sequelize) {
    ReportPlanningBox.init({
        reportBoxId: { type: sequelize_1.DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
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
        wasteLoss: { type: sequelize_1.DataTypes.DOUBLE, allowNull: false },
        shiftManagement: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        machine: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        //FK
        planningBoxId: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    }, {
        sequelize,
        tableName: "ReportPlanningBoxes",
        timestamps: true,
        indexes: [
            //FK
            { fields: ["planningBoxId"] },
            //indexes
            { fields: ["dayReport"] },
            { fields: ["shiftManagement"] },
            { fields: ["machine"] },
        ],
    });
    return ReportPlanningBox;
}
//# sourceMappingURL=reportPlanningBox.js.map