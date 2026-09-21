"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QcInspectionPaper = void 0;
exports.initQcInspectionPaperModel = initQcInspectionPaperModel;
const sequelize_1 = require("sequelize");
//định nghĩa kiểu OOP
class QcInspectionPaper extends sequelize_1.Model {
}
exports.QcInspectionPaper = QcInspectionPaper;
function initQcInspectionPaperModel(sequelize) {
    QcInspectionPaper.init({
        inspecPaperId: { type: sequelize_1.DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
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
        //user input
        numberPallet: { type: sequelize_1.DataTypes.INTEGER },
        machineSpeed: { type: sequelize_1.DataTypes.DOUBLE, allowNull: false },
        moisture: { type: sequelize_1.DataTypes.DOUBLE, allowNull: false }, //độ ẩm
        steamPressure: { type: sequelize_1.DataTypes.DOUBLE, allowNull: false }, //áp suất hơi
        preheaterTemp: { type: sequelize_1.DataTypes.DOUBLE, allowNull: false }, //nhiệt độ đầu sóng
        fctValue: { type: sequelize_1.DataTypes.DOUBLE, allowNull: false }, //giá trị FCT
        patValue: { type: sequelize_1.DataTypes.DOUBLE, allowNull: false }, //giá trị PAT
        checkList: { type: sequelize_1.DataTypes.JSON, allowNull: false }, //danh sách kiểm tra
        checkedBy: { type: sequelize_1.DataTypes.STRING, allowNull: false }, //người kiểm tra
        note: { type: sequelize_1.DataTypes.STRING }, //ghi chú
        //FK
        planningId: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
        userId: { type: sequelize_1.DataTypes.INTEGER },
    }, {
        sequelize,
        tableName: "qc_inspection_papers",
        timestamps: true,
        indexes: [
            //FK
            { fields: ["planningId"] },
            { fields: ["userId"] },
        ],
    });
    return QcInspectionPaper;
}
//# sourceMappingURL=qcInspectionPaper.js.map