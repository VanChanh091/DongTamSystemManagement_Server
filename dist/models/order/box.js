"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Box = void 0;
exports.initBoxModel = initBoxModel;
const sequelize_1 = require("sequelize");
//định nghĩa kiểu OOP
class Box extends sequelize_1.Model {
}
exports.Box = Box;
function initBoxModel(sequelize) {
    Box.init({
        boxId: {
            type: sequelize_1.DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        inMatTruoc: { type: sequelize_1.DataTypes.INTEGER },
        inMatSau: { type: sequelize_1.DataTypes.INTEGER },
        chongTham: { type: sequelize_1.DataTypes.BOOLEAN },
        canLan: { type: sequelize_1.DataTypes.BOOLEAN },
        canMang: { type: sequelize_1.DataTypes.BOOLEAN },
        Xa: { type: sequelize_1.DataTypes.BOOLEAN },
        catKhe: { type: sequelize_1.DataTypes.BOOLEAN },
        be: { type: sequelize_1.DataTypes.BOOLEAN },
        maKhuon: { type: sequelize_1.DataTypes.STRING },
        dan_1_Manh: { type: sequelize_1.DataTypes.BOOLEAN },
        dan_2_Manh: { type: sequelize_1.DataTypes.BOOLEAN },
        dongGhim1Manh: { type: sequelize_1.DataTypes.BOOLEAN },
        dongGhim2Manh: { type: sequelize_1.DataTypes.BOOLEAN },
        dongGoi: { type: sequelize_1.DataTypes.STRING },
        //FK
        orderId: { type: sequelize_1.DataTypes.STRING },
    }, { sequelize, tableName: "Boxes", timestamps: true });
    return Box;
}
//# sourceMappingURL=box.js.map