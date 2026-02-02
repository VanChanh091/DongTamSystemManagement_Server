"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
exports.initUserModel = initUserModel;
const sequelize_1 = require("sequelize");
class User extends sequelize_1.Model {
}
exports.User = User;
function initUserModel(sequelize) {
    User.init({
        userId: {
            type: sequelize_1.DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        fullName: {
            type: sequelize_1.DataTypes.STRING,
            allowNull: false,
        },
        email: {
            type: sequelize_1.DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        password: {
            type: sequelize_1.DataTypes.STRING,
            allowNull: false,
        },
        sex: {
            type: sequelize_1.DataTypes.STRING,
        },
        phone: {
            type: sequelize_1.DataTypes.STRING,
        },
        role: {
            type: sequelize_1.DataTypes.ENUM("admin", "user", "manager"),
            defaultValue: "user",
        },
        permissions: {
            type: sequelize_1.DataTypes.TEXT,
            get() {
                const rawValue = this.getDataValue("permissions");
                return rawValue ? JSON.parse(rawValue) : [];
            },
            set(val) {
                this.setDataValue("permissions", JSON.stringify(val));
            },
            defaultValue: "[]",
        },
        avatar: {
            type: sequelize_1.DataTypes.STRING,
            defaultValue: "https://static.vecteezy.com/system/resources/previews/024/983/914/original/simple-user-default-icon-free-png.png",
        },
    }, {
        sequelize,
        tableName: "Users",
        timestamps: true,
        indexes: [{ fields: ["fullName"] }],
    });
    return User;
}
//# sourceMappingURL=user.js.map