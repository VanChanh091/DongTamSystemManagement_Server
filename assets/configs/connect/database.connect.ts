import { Sequelize } from "sequelize";
import dotenv from "dotenv";
dotenv.config();

interface DBConfig {
  database: string;
  username: string;
  password: string;
  host: string;
}

let dbConfig: DBConfig;

const env = process.env.NODE_ENV === "development";

if (env) {
  dbConfig = {
    database: process.env.DB_NAME_DEV as string,
    username: process.env.DB_USER_DEV as string,
    password: process.env.DB_PASS_DEV as string,
    host: process.env.DB_HOST_DEV as string,
  };
} else {
  dbConfig = {
    database: process.env.DB_NAME_PROD as string,
    username: process.env.DB_USER_PROD as string,
    password: process.env.DB_PASS_PROD as string,
    host: process.env.DB_HOST_PROD as string,
  };
}

// Khởi tạo Sequelize với thông tin kết nối MySQL
const sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, {
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

const connectDB = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    console.log(`✅ DB đang chạy ở môi trường ${process.env.NODE_ENV}!`);
  } catch (error) {
    console.error("❌ Lỗi kết nối MySQL:", error);
    process.exit(1);
  }
};

export { sequelize, connectDB };
