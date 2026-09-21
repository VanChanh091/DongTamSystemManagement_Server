"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = exports.sequelize = void 0;
const sequelize_1 = require("sequelize");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
let dbConfig;
const env = process.env.NODE_ENV === "development";
if (env) {
    dbConfig = {
        database: process.env.DB_NAME_DEV,
        username: process.env.DB_USER_DEV,
        password: process.env.DB_PASS_DEV,
        host: process.env.DB_HOST_DEV,
    };
}
else {
    dbConfig = {
        database: process.env.DB_NAME_PROD,
        username: process.env.DB_USER_PROD,
        password: process.env.DB_PASS_PROD,
        host: process.env.DB_HOST_PROD,
    };
}
// Khởi tạo Sequelize với thông tin kết nối MySQL
const sequelize = new sequelize_1.Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, {
    host: dbConfig.host,
    dialect: "mysql",
    port: 3306,
    timezone: "+07:00",
    logging: false,
    pool: {
        max: 20, // Số lượng kết nối tối đa được phép mở đồng thời
        min: 0, // Số lượng kết nối tối thiểu được duy trì (ngay cả khi rảnh rỗi)
        acquire: 30000, // Thời gian tối đa (ms) mà một request phải đợi để mượn được connection trước khi báo lỗi (Timeout)
        idle: 10000, // Thời gian tối đa (ms) một kết nối được phép giải phóng/rảnh rỗi trước khi bị đóng để tiết kiệm tài nguyên
    },
});
exports.sequelize = sequelize;
const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log(`✅ DB đang chạy ở môi trường ${process.env.NODE_ENV}!`);
    }
    catch (error) {
        console.error("❌ Lỗi kết nối MySQL:", error);
        process.exit(1);
    }
};
exports.connectDB = connectDB;
//# sourceMappingURL=database.connect.js.map