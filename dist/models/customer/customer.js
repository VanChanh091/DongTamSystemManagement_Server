"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Customer = void 0;
exports.initCustomerModel = initCustomerModel;
const sequelize_1 = require("sequelize");
//định nghĩa kiểu OOP
class Customer extends sequelize_1.Model {
}
exports.Customer = Customer;
function initCustomerModel(sequelize) {
    Customer.init({
        customerId: {
            type: sequelize_1.DataTypes.STRING(14),
            allowNull: false,
            primaryKey: true,
        },
        customerName: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        companyName: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        companyAddress: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        shippingAddress: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        distance: { type: sequelize_1.DataTypes.DOUBLE },
        mst: { type: sequelize_1.DataTypes.STRING },
        phone: { type: sequelize_1.DataTypes.STRING },
        contactPerson: { type: sequelize_1.DataTypes.STRING },
        dayCreated: { type: sequelize_1.DataTypes.DATE },
        debtCurrent: { type: sequelize_1.DataTypes.DOUBLE },
        debtLimit: { type: sequelize_1.DataTypes.DOUBLE },
        timePayment: { type: sequelize_1.DataTypes.DATE },
        rateCustomer: { type: sequelize_1.DataTypes.STRING },
        cskh: { type: sequelize_1.DataTypes.STRING, allowNull: false },
    }, { sequelize, tableName: "Customers", timestamps: true });
    return Customer;
}
//# sourceMappingURL=customer.js.map