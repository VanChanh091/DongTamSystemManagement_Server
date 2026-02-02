"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Vehicle = void 0;
exports.initVehicleModel = initVehicleModel;
const sequelize_1 = require("sequelize");
//định nghĩa kiểu OOP
class Vehicle extends sequelize_1.Model {
}
exports.Vehicle = Vehicle;
function initVehicleModel(sequelize) {
    Vehicle.init({
        vehicleId: { type: sequelize_1.DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        vehicleName: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        licensePlate: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        maxPayload: { type: sequelize_1.DataTypes.DOUBLE, allowNull: false }, //tai trong
        volumeCapacity: { type: sequelize_1.DataTypes.DOUBLE, allowNull: false }, //dung tich
        vehicleHouse: { type: sequelize_1.DataTypes.STRING, allowNull: false },
    }, { sequelize, tableName: "Vehicle", timestamps: true });
    return Vehicle;
}
//# sourceMappingURL=vehicle.js.map