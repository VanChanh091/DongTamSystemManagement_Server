"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanningPaper = void 0;
exports.initPlanningPaperModel = initPlanningPaperModel;
const sequelize_1 = require("sequelize");
//định nghĩa kiểu OOP
class PlanningPaper extends sequelize_1.Model {
}
exports.PlanningPaper = PlanningPaper;
function initPlanningPaperModel(sequelize) {
    PlanningPaper.init({
        planningId: {
            type: sequelize_1.DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
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
        timeRunning: { type: sequelize_1.DataTypes.TIME },
        dayReplace: { type: sequelize_1.DataTypes.STRING },
        matEReplace: { type: sequelize_1.DataTypes.STRING },
        matBReplace: { type: sequelize_1.DataTypes.STRING },
        matCReplace: { type: sequelize_1.DataTypes.STRING },
        matE2Replace: { type: sequelize_1.DataTypes.STRING },
        songEReplace: { type: sequelize_1.DataTypes.STRING },
        songBReplace: { type: sequelize_1.DataTypes.STRING },
        songCReplace: { type: sequelize_1.DataTypes.STRING },
        songE2Replace: { type: sequelize_1.DataTypes.STRING },
        lengthPaperPlanning: { type: sequelize_1.DataTypes.DOUBLE, allowNull: false },
        sizePaperPLaning: { type: sequelize_1.DataTypes.DOUBLE, allowNull: false },
        runningPlan: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
        qtyProduced: { type: sequelize_1.DataTypes.INTEGER },
        numberChild: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
        ghepKho: { type: sequelize_1.DataTypes.INTEGER },
        bottom: { type: sequelize_1.DataTypes.DOUBLE },
        fluteE: { type: sequelize_1.DataTypes.DOUBLE },
        fluteB: { type: sequelize_1.DataTypes.DOUBLE },
        fluteC: { type: sequelize_1.DataTypes.DOUBLE },
        fluteE2: { type: sequelize_1.DataTypes.DOUBLE },
        knife: { type: sequelize_1.DataTypes.DOUBLE },
        totalLoss: { type: sequelize_1.DataTypes.DOUBLE },
        qtyWasteNorm: { type: sequelize_1.DataTypes.DOUBLE },
        shiftProduction: { type: sequelize_1.DataTypes.STRING },
        shiftManagement: { type: sequelize_1.DataTypes.STRING },
        chooseMachine: {
            type: sequelize_1.DataTypes.ENUM("Máy 1350", "Máy 1900", "Máy 2 Lớp", "Máy Quấn Cuồn"),
            allowNull: false,
        },
        status: {
            type: sequelize_1.DataTypes.ENUM("planning", "complete", "lackQty", "producing", "stop", "cancel"),
            allowNull: false,
            defaultValue: "planning",
        },
        statusRequest: {
            type: sequelize_1.DataTypes.ENUM("none", "requested", "inbounded", "finalize"),
            defaultValue: "none",
        },
        hasOverFlow: {
            type: sequelize_1.DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        hasBox: { type: sequelize_1.DataTypes.BOOLEAN, defaultValue: false },
        deliveryPlanned: {
            type: sequelize_1.DataTypes.ENUM("none", "pending", "planned", "delivered"),
            defaultValue: "none",
        },
        sortPlanning: { type: sequelize_1.DataTypes.INTEGER },
        //FK
        orderId: { type: sequelize_1.DataTypes.STRING },
    }, {
        sequelize,
        tableName: "Plannings",
        timestamps: true,
        indexes: [
            //FK
            { fields: ["orderId"] },
            //search
            { fields: ["ghepKho"] },
            //indexes
            { fields: ["sortPlanning"] },
            { fields: ["status"] },
            //Composite indexes
            { fields: ["chooseMachine", "status"] },
            { fields: ["chooseMachine", "dayStart"] },
            { fields: ["deliveryPlanned", "dayStart", "status"] },
            { fields: ["dayStart", "timeRunning"] },
            //get paper waiting check
            { fields: ["hasBox", "statusRequest"] },
        ],
    });
    return PlanningPaper;
}
//# sourceMappingURL=planningPaper.js.map