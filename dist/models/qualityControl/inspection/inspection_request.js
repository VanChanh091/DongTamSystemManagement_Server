"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InspectionRequest = void 0;
exports.initInspectionRequestModel = initInspectionRequestModel;
const sequelize_1 = require("sequelize");
//định nghĩa kiểu OOP
class InspectionRequest extends sequelize_1.Model {
}
exports.InspectionRequest = InspectionRequest;
function initInspectionRequestModel(sequelize) {
    InspectionRequest.init({
        inspectionId: { type: sequelize_1.DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        requestedAt: { type: sequelize_1.DataTypes.DATE, allowNull: false },
        arrivedAt: { type: sequelize_1.DataTypes.DATE },
        requestedBy: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        completedBy: { type: sequelize_1.DataTypes.STRING },
        status: {
            type: sequelize_1.DataTypes.ENUM("pending", "in_progress", "passed", "failed", "missing"),
            allowNull: false,
            defaultValue: "pending",
        },
        result: { type: sequelize_1.DataTypes.BOOLEAN, allowNull: true },
        //FK
        planningId: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    }, {
        sequelize,
        tableName: "inspection_requests",
        timestamps: true,
        indexes: [
            //FK
            { fields: ["planningId"] },
            { fields: ["status"] },
            { fields: ["result"] },
            //composite index
            { fields: ["planningId", "status"] },
        ],
    });
    return InspectionRequest;
}
//# sourceMappingURL=inspection_request.js.map