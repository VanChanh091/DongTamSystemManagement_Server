"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QcInspectionBox = void 0;
exports.initQcInspectionBoxModel = initQcInspectionBoxModel;
const sequelize_1 = require("sequelize");
//định nghĩa kiểu OOP
class QcInspectionBox extends sequelize_1.Model {
}
exports.QcInspectionBox = QcInspectionBox;
function initQcInspectionBoxModel(sequelize) {
    QcInspectionBox.init({
        inspecBoxId: { type: sequelize_1.DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        timeInspection: {
            type: sequelize_1.DataTypes.DATE,
            allowNull: false,
            get() {
                const rawValue = this.getDataValue("timeInspection");
                if (!rawValue)
                    return null;
                return new Date(rawValue.getTime() - rawValue.getTimezoneOffset() * 60000).toISOString();
            },
        },
        checkList: { type: sequelize_1.DataTypes.JSON, allowNull: false }, //danh sách kiểm tra
        checkedBy: { type: sequelize_1.DataTypes.STRING, allowNull: false }, //người kiểm tra
        note: { type: sequelize_1.DataTypes.STRING }, //ghi chú
        //FK
        boxTimeId: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
        userId: { type: sequelize_1.DataTypes.INTEGER },
    }, {
        sequelize,
        tableName: "qc_inspection_boxes",
        timestamps: true,
        indexes: [
            //FK
            { fields: ["boxTimeId"] },
        ],
    });
    return QcInspectionBox;
}
//# sourceMappingURL=qcInspectionBox.js.map