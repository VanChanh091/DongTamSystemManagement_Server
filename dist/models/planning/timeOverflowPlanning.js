"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.timeOverflowPlanning = void 0;
exports.initTimeOverflowPlanningModel = initTimeOverflowPlanningModel;
const sequelize_1 = require("sequelize");
//định nghĩa kiểu OOP
class timeOverflowPlanning extends sequelize_1.Model {
}
exports.timeOverflowPlanning = timeOverflowPlanning;
function initTimeOverflowPlanningModel(sequelize) {
    timeOverflowPlanning.init({
        overflowId: {
            type: sequelize_1.DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        overflowDayStart: { type: sequelize_1.DataTypes.DATE },
        overflowDayCompleted: {
            type: sequelize_1.DataTypes.DATE,
            get() {
                const rawValue = this.getDataValue("overflowDayCompleted");
                if (!rawValue)
                    return null;
                return new Date(rawValue.getTime() - rawValue.getTimezoneOffset() * 60000).toISOString();
            },
        },
        overflowTimeRunning: { type: sequelize_1.DataTypes.TIME },
        machine: { type: sequelize_1.DataTypes.STRING },
        status: {
            type: sequelize_1.DataTypes.ENUM("planning", "lackOfQty", "complete"),
            allowNull: false,
            defaultValue: "planning",
        },
        //FK
        planningId: { type: sequelize_1.DataTypes.INTEGER },
        planningBoxId: { type: sequelize_1.DataTypes.INTEGER },
    }, { sequelize, tableName: "timeOverflowPlannings", timestamps: true });
    return timeOverflowPlanning;
}
//# sourceMappingURL=timeOverflowPlanning.js.map