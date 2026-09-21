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
        //date & time
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
        timeStart: { type: sequelize_1.DataTypes.TIME },
        timeRunning: { type: sequelize_1.DataTypes.TIME },
        //structure replace
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
        totalPrice: { type: sequelize_1.DataTypes.DOUBLE, allowNull: false, defaultValue: 0 },
        numberChild: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
        ghepKho: { type: sequelize_1.DataTypes.INTEGER },
        //waste norm
        bottom: { type: sequelize_1.DataTypes.DOUBLE },
        fluteE: { type: sequelize_1.DataTypes.DOUBLE },
        fluteB: { type: sequelize_1.DataTypes.DOUBLE },
        fluteC: { type: sequelize_1.DataTypes.DOUBLE },
        fluteE2: { type: sequelize_1.DataTypes.DOUBLE },
        knife: { type: sequelize_1.DataTypes.DOUBLE },
        totalLoss: { type: sequelize_1.DataTypes.DOUBLE },
        qtyWasteNorm: { type: sequelize_1.DataTypes.DOUBLE, defaultValue: 0 },
        //other info
        shiftProduction: { type: sequelize_1.DataTypes.STRING },
        shiftManagement: { type: sequelize_1.DataTypes.STRING },
        note: { type: sequelize_1.DataTypes.STRING },
        chooseMachine: {
            type: sequelize_1.DataTypes.ENUM("Máy 1350", "Máy 1900", "Máy 2 Lớp", "Máy Quấn Cuồn"),
            allowNull: false,
        },
        status: {
            type: sequelize_1.DataTypes.ENUM("planning", "lackQty", "producing", "requested", "complete", "stop", "cancel"),
            allowNull: false,
            defaultValue: "planning",
        },
        statusRequest: {
            type: sequelize_1.DataTypes.ENUM("none", "requested", "inbounded", "finalize"),
            defaultValue: "none",
        },
        statusCheck: {
            type: sequelize_1.DataTypes.ENUM("none", "failed", "fixed", "passed"),
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
        tableName: "planning_papers",
        timestamps: true,
        indexes: [
            //FK
            { fields: ["orderId"] },
            //indexes
            { fields: ["sortPlanning"] },
            { fields: ["status"] },
            //Composite indexes
            { fields: ["chooseMachine", "status"] },
            { fields: ["chooseMachine", "dayStart"] },
            { fields: ["chooseMachine", "status", "dayStart"] },
            { fields: ["deliveryPlanned", "dayStart", "status"] },
            { fields: ["dayStart", "timeRunning"] },
            { fields: ["dayCompleted", "shiftProduction"] },
            //get paper waiting check
            { fields: ["statusRequest", "hasBox"] },
            { fields: ["chooseMachine", "status", "statusCheck"] },
        ],
    });
    return PlanningPaper;
}
//# sourceMappingURL=planningPaper.js.map