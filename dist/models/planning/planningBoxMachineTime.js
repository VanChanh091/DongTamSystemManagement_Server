"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanningBoxTime = void 0;
exports.initPlanningBoxTimeModel = initPlanningBoxTimeModel;
const sequelize_1 = require("sequelize");
//định nghĩa kiểu OOP
class PlanningBoxTime extends sequelize_1.Model {
}
exports.PlanningBoxTime = PlanningBoxTime;
//tạo table
function initPlanningBoxTimeModel(sequelize) {
    PlanningBoxTime.init({
        boxTimeId: {
            type: sequelize_1.DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        runningPlan: { type: sequelize_1.DataTypes.INTEGER },
        timeRunning: { type: sequelize_1.DataTypes.TIME },
        dayStart: { type: sequelize_1.DataTypes.DATE },
        dayCompleted: {
            type: sequelize_1.DataTypes.DATE,
            get() {
                const rawValue = this.getDataValue("dayCompleted");
                if (!rawValue)
                    return null;
                return new Date(rawValue.getTime() - rawValue.getTimezoneOffset() * 60000).toISOString();
            },
        },
        wasteBox: { type: sequelize_1.DataTypes.DOUBLE },
        rpWasteLoss: { type: sequelize_1.DataTypes.DOUBLE },
        qtyProduced: { type: sequelize_1.DataTypes.INTEGER },
        machine: {
            type: sequelize_1.DataTypes.ENUM("Máy In", "Máy Cấn Lằn", "Máy Bế", "Máy Xả", "Máy Dán", "Máy Cắt Khe", "Máy Cán Màng", "Máy Đóng Ghim"),
            allowNull: false,
        },
        shiftManagement: { type: sequelize_1.DataTypes.STRING },
        status: {
            type: sequelize_1.DataTypes.ENUM("planning", "lackOfQty", "complete", "producing", "stop"),
            allowNull: false,
            defaultValue: "planning",
        },
        sortPlanning: { type: sequelize_1.DataTypes.INTEGER },
        isRequest: { type: sequelize_1.DataTypes.BOOLEAN, defaultValue: false },
        //FK
        planningBoxId: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    }, {
        sequelize,
        tableName: "PlanningBoxTimes",
        timestamps: true,
        indexes: [
            //FK
            { fields: ["planningBoxId"] },
            //indexes
            { fields: ["machine"] },
            { fields: ["status"] },
            { fields: ["machine", "planningBoxId", "status"] },
            { fields: ["machine", "dayStart", "sortPlanning"] },
        ],
    });
    return PlanningBoxTime;
}
//# sourceMappingURL=planningBoxMachineTime.js.map