"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaperBasisWeights = void 0;
exports.initPaperBasisWeightsModel = initPaperBasisWeightsModel;
const sequelize_1 = require("sequelize");
//định nghĩa kiểu OOP
class PaperBasisWeights extends sequelize_1.Model {
}
exports.PaperBasisWeights = PaperBasisWeights;
function initPaperBasisWeightsModel(sequelize) {
    PaperBasisWeights.init({
        basisWeightId: { type: sequelize_1.DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        basisWeight: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
        weightCode: { type: sequelize_1.DataTypes.STRING, allowNull: true },
    }, {
        sequelize,
        tableName: "admin_paper_basis_weights",
        timestamps: true,
    });
    return PaperBasisWeights;
}
//# sourceMappingURL=paperBasisWeights.js.map