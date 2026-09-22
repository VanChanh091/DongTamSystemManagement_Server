"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaperRequirements = void 0;
exports.initPaperRequirementsModel = initPaperRequirementsModel;
const sequelize_1 = require("sequelize");
//định nghĩa kiểu OOP
class PaperRequirements extends sequelize_1.Model {
}
exports.PaperRequirements = PaperRequirements;
//tạo table
function initPaperRequirementsModel(sequelize) {
    PaperRequirements.init({
        requirementId: { type: sequelize_1.DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        paperRollWidth: { type: sequelize_1.DataTypes.INTEGER, allowNull: false, comment: "Khổ giấy được cấp" },
        // weightPerRoll: { type: DataTypes.DOUBLE, allowNull: false, comment: "Trọng lượng 1 tấm/" },
        totalRequiredQty: { type: sequelize_1.DataTypes.DOUBLE, allowNull: false },
        inventoryStatus: {
            type: sequelize_1.DataTypes.ENUM("ENOUGH", "SHORTAGE", "WARNING"),
            allowNull: false,
            comment: "Trạng thái tồn kho",
        },
        status: {
            type: sequelize_1.DataTypes.ENUM("PLANNING", "COMPLETED"),
            allowNull: false,
            defaultValue: "PLANNING",
        },
        //FK
        planningId: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    }, {
        sequelize,
        tableName: "paper_requirements",
        timestamps: true,
        indexes: [
            //FK
            { fields: ["planningId"] },
            //composite index
            { fields: ["planningId", "totalRequiredQty"] },
        ],
    });
    return PaperRequirements;
}
//# sourceMappingURL=paperRequirements.js.map