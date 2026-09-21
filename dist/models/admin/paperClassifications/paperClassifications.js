"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaperClassifications = void 0;
exports.initPaperClassificationsModel = initPaperClassificationsModel;
const sequelize_1 = require("sequelize");
//định nghĩa kiểu OOP
class PaperClassifications extends sequelize_1.Model {
}
exports.PaperClassifications = PaperClassifications;
function initPaperClassificationsModel(sequelize) {
    PaperClassifications.init({
        classificationId: { type: sequelize_1.DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        paperCode: { type: sequelize_1.DataTypes.STRING, allowNull: false, comment: "Mã giấy lưu kho" },
        weightCategory: { type: sequelize_1.DataTypes.STRING, allowNull: false, comment: "Phân loại định lượng" },
        burstRatio: { type: sequelize_1.DataTypes.DOUBLE, allowNull: true, comment: "Tỷ lệ độ bục" },
        burstStrength: { type: sequelize_1.DataTypes.DOUBLE, allowNull: true, comment: "Độ bục" },
        ringCrush: { type: sequelize_1.DataTypes.DOUBLE, allowNull: true, comment: "Độ bền nén vòng" },
        pricePaper: { type: sequelize_1.DataTypes.DOUBLE, allowNull: true, defaultValue: 0 },
        //FK
        supplierPaperId: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
        basisWeightId: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    }, {
        sequelize,
        tableName: "admin_paper_classifications",
        timestamps: true,
        indexes: [{ fields: ["supplierPaperId"] }, { fields: ["basisWeightId"] }],
    });
    return PaperClassifications;
}
//# sourceMappingURL=paperClassifications.js.map