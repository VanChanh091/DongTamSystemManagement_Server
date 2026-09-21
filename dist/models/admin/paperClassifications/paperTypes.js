"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaperTypes = void 0;
exports.initPaperTypesModel = initPaperTypesModel;
const sequelize_1 = require("sequelize");
//định nghĩa kiểu OOP
class PaperTypes extends sequelize_1.Model {
}
exports.PaperTypes = PaperTypes;
function initPaperTypesModel(sequelize) {
    PaperTypes.init({
        paperTypeId: { type: sequelize_1.DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        paperName: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        paperCode: { type: sequelize_1.DataTypes.STRING, allowNull: false },
    }, {
        sequelize,
        tableName: "admin_paper_types",
        timestamps: true,
    });
    return PaperTypes;
}
//# sourceMappingURL=paperTypes.js.map