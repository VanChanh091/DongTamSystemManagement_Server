"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaperRequirementLayers = void 0;
exports.initPaperRequirementLayersModel = initPaperRequirementLayersModel;
const sequelize_1 = require("sequelize");
//định nghĩa kiểu OOP
class PaperRequirementLayers extends sequelize_1.Model {
}
exports.PaperRequirementLayers = PaperRequirementLayers;
//tạo table
function initPaperRequirementLayersModel(sequelize) {
    PaperRequirementLayers.init({
        layerId: { type: sequelize_1.DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        layerIndex: { type: sequelize_1.DataTypes.INTEGER, allowNull: false, comment: "Vị trí của lớp giấy" },
        layerRole: {
            type: sequelize_1.DataTypes.ENUM("BOTTOM", "FLUTE_1", "MID_1", "FLUTE_2", "MID_2", "FLUTE_3", "TOP"),
            allowNull: false,
            defaultValue: "BOTTOM",
        },
        paperCode: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        weightGsm: { type: sequelize_1.DataTypes.INTEGER, allowNull: false, comment: "Định lượng giấy (g/m2)" },
        fluteType: { type: sequelize_1.DataTypes.ENUM("E", "B", "C"), comment: "Loại sóng" },
        availableStock: {
            type: sequelize_1.DataTypes.DOUBLE,
            allowNull: false,
            comment: "Số lượng giấy còn trong kho (kg)",
        },
        shortageQty: {
            type: sequelize_1.DataTypes.DOUBLE,
            allowNull: false,
            comment: "Số lượng giấy thiếu (kg)",
        },
        isEnoughQty: {
            type: sequelize_1.DataTypes.BOOLEAN,
            allowNull: false,
            comment: "Kiểm tra xem có đủ lượng giấy không",
        },
        //FK
        requirementId: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    }, {
        sequelize,
        tableName: "paper_requirement_layers",
        timestamps: true,
        indexes: [
            //FK
            { fields: ["requirementId"] },
            // { fields: ["paperCode", "paperRollWidth"] },
        ],
    });
    return PaperRequirementLayers;
}
//# sourceMappingURL=paper_requirement_layers.js.map